import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

export const maxDuration = 60;
const json = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function POST(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content management access required." },
    access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);

  let body: { job_id?: string; action?: string };
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
  if (!body.job_id || !/^[0-9a-f-]{36}$/i.test(body.job_id)) return json({ error: "A valid job_id is required." }, 400);
  if (body.action && !["retry_failed", "cancel"].includes(body.action)) return json({ error: "Invalid job action." }, 400);

  const db = access.client;
  const jobResult = await db.from("catalogue_import_jobs").select("*")
    .eq("id", body.job_id).eq("actor_id", access.userId).maybeSingle();
  if (jobResult.error || !jobResult.data) return json({ error: "Import job not found." }, 404);
  const job = jobResult.data;

  if (body.action === "retry_failed") {
    if (job.status === "cancelled") return json({ error: "Cancelled jobs cannot be retried." }, 409);
    const reset = await db.from("catalogue_import_job_items")
      .update({ status: "pending", error_message: null, updated_at: new Date().toISOString() })
      .eq("job_id", job.id).eq("status", "failed");
    if (reset.error) return json({ error: "Could not reset failed items." }, 500);
    const queued = await db.from("catalogue_import_jobs")
      .update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", job.id);
    if (queued.error) return json({ error: "Could not queue failed items." }, 500);
    return json({ retried: true });
  }

  if (body.action === "cancel") {
    if (job.status === "completed" || job.status === "failed" || job.status === "partial") {
      return json({ error: "Finished jobs cannot be cancelled." }, 409);
    }
    const cancelled = await db.from("catalogue_import_jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", job.id);
    if (cancelled.error) return json({ error: "Could not cancel import job." }, 500);
    const stopped = await db.from("catalogue_import_job_items")
      .update({ status: "failed", error_message: "Cancelled by admin.", updated_at: new Date().toISOString() })
      .eq("job_id", job.id).eq("status", "pending");
    if (stopped.error) return json({ error: "Job was cancelled, but pending items could not be stopped." }, 500);
    return json({ cancelled: true });
  }

  if (job.status === "cancelled" || job.status === "completed" || job.status === "failed") {
    return json({ status: job.status });
  }

  // Recover only genuinely stale claims; do not reset work owned by another active request.
  const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const recovered = await db.from("catalogue_import_job_items")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("job_id", job.id).eq("status", "processing").lt("updated_at", staleBefore);
  if (recovered.error) return json({ error: "Could not recover interrupted items." }, 500);

  const pending = await db.from("catalogue_import_job_items").select("id,tmdb_id")
    .eq("job_id", job.id).eq("status", "pending").order("tmdb_id").limit(3);
  if (pending.error) return json({ error: "Could not load pending import items." }, 500);

  const origin = new URL(request.url).origin;
  const cookie = request.headers.get("cookie") ?? "";
  const results: Array<{ tmdb_id: number; status: string; error?: string }> = [];

  for (const item of pending.data ?? []) {
    const currentJob = await db.from("catalogue_import_jobs").select("status").eq("id", job.id).maybeSingle();
    if (currentJob.error) return json({ error: "Could not confirm import job state." }, 500);
    if (!currentJob.data || currentJob.data.status === "cancelled") {
      await db.from("catalogue_import_job_items").update({
        status: "failed", error_message: "Cancelled by admin.", updated_at: new Date().toISOString(),
      }).eq("id", item.id).in("status", ["pending", "processing"]);
      break;
    }

    const previousAttempt = await db.from("catalogue_import_job_items").select("attempts")
      .eq("id", item.id).eq("status", "pending").maybeSingle();
    if (previousAttempt.error) return json({ error: "Could not read item retry count." }, 500);
    if (!previousAttempt.data) continue;

    const claim = await db.from("catalogue_import_job_items").update({
      status: "processing",
      attempts: (previousAttempt.data.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id).eq("status", "pending").select("id").maybeSingle();
    if (claim.error) return json({ error: "Could not claim an import item." }, 500);
    if (!claim.data) continue;

    try {
      const response = await fetch(new URL("/api/admin/content-import", origin), {
        method: "POST", headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ tmdb_id: item.tmdb_id, kind: job.kind }),
        signal: AbortSignal.timeout(45000),
      });
      let data: { error?: unknown };
      try { data = await response.json(); }
      catch { throw new Error("Import endpoint returned invalid JSON."); }
      if (!response.ok) throw new Error(String(data.error ?? "TMDB import failed.").slice(0, 300));
      const saved = await db.from("catalogue_import_job_items").update({
        status: "imported", error_message: null, updated_at: new Date().toISOString(),
      }).eq("id", item.id).eq("status", "processing");
      if (saved.error) return json({ error: "Title imported, but job progress could not be saved. Resume after checking the title." }, 500);
      results.push({ tmdb_id: item.tmdb_id, status: "imported" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      const saved = await db.from("catalogue_import_job_items").update({
        status: "failed", error_message: message.slice(0, 300), updated_at: new Date().toISOString(),
      }).eq("id", item.id).eq("status", "processing");
      if (saved.error) return json({ error: "Import failed and its job status could not be saved." }, 500);
      results.push({ tmdb_id: item.tmdb_id, status: "failed", error: message });
    }
  }

  const [done, failed, stillPending, latestJob] = await Promise.all([
    db.from("catalogue_import_job_items").select("id", { count: "exact", head: true }).eq("job_id", job.id).eq("status", "imported"),
    db.from("catalogue_import_job_items").select("id", { count: "exact", head: true }).eq("job_id", job.id).eq("status", "failed"),
    db.from("catalogue_import_job_items").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]).eq("job_id", job.id),
    db.from("catalogue_import_jobs").select("status").eq("id", job.id).maybeSingle(),
  ]);
  if (done.error || failed.error || stillPending.error || latestJob.error || !latestJob.data) {
    return json({ error: "Could not calculate final import progress." }, 500);
  }
  const importedCount = done.count ?? 0;
  const failedCount = failed.count ?? 0;
  const pendingCount = stillPending.count ?? 0;
  const status = latestJob.data.status === "cancelled"
    ? "cancelled"
    : pendingCount > 0 ? "processing"
    : failedCount > 0 ? (importedCount > 0 ? "partial" : "failed")
    : "completed";

  const updated = await db.from("catalogue_import_jobs").update({
    status, processed_items: importedCount + failedCount, imported_items: importedCount,
    failed_items: failedCount, updated_at: new Date().toISOString(),
  }).eq("id", job.id).neq("status", "cancelled");
  if (updated.error) return json({ error: "Could not save import job progress." }, 500);
  return json({ status, imported: importedCount, failed: failedCount, pending: pendingCount, results });
}
