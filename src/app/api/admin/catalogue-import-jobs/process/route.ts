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

  const db = access.client as any;
  const jobResult = await db.from("catalogue_import_jobs").select("*")
    .eq("id", body.job_id).eq("actor_id", access.userId).maybeSingle();
  if (jobResult.error || !jobResult.data) return json({ error: "Import job not found." }, 404);
  const job = jobResult.data;

  if (body.action === "retry_failed") {
    const reset = await db.from("catalogue_import_job_items")
      .update({ status: "pending", error_message: null }).eq("job_id", job.id).eq("status", "failed");
    if (reset.error) return json({ error: "Could not reset failed items." }, 400);
    await db.from("catalogue_import_jobs").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", job.id);
    return json({ retried: true });
  }
  if (body.action === "cancel") {
    await db.from("catalogue_import_jobs").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", job.id);
    await db.from("catalogue_import_job_items").update({ status: "failed", error_message: "Cancelled by admin." })
      .eq("job_id", job.id).eq("status", "pending");
    return json({ cancelled: true });
  }
  if (job.status === "cancelled" || job.status === "completed") return json({ status: job.status });

  await db.from("catalogue_import_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", job.id);
  const pending = await db.from("catalogue_import_job_items").select("id,tmdb_id")
    .eq("job_id", job.id).eq("status", "pending").order("tmdb_id").limit(3);
  if (pending.error) return json({ error: "Could not load pending import items." }, 400);

  const origin = new URL(request.url).origin;
  const cookie = request.headers.get("cookie") ?? "";
  const results: Array<{ tmdb_id: number; status: string; error?: string }> = [];
  for (const item of pending.data ?? []) {
    await db.from("catalogue_import_job_items").update({
      status: "processing", attempts: (await db.from("catalogue_import_job_items").select("attempts").eq("id", item.id).single()).data?.attempts + 1 || 1,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id).eq("status", "pending");
    try {
      const response = await fetch(new URL("/api/admin/content-import", origin), {
        method: "POST", headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ tmdb_id: item.tmdb_id, kind: job.kind }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data.error ?? "TMDB import failed.").slice(0, 300));
      await db.from("catalogue_import_job_items").update({
        status: "imported", error_message: null, updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      results.push({ tmdb_id: item.tmdb_id, status: "imported" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      await db.from("catalogue_import_job_items").update({
        status: "failed", error_message: message.slice(0, 300), updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      results.push({ tmdb_id: item.tmdb_id, status: "failed", error: message });
    }
  }

  const [done, failed, stillPending] = await Promise.all([
    db.from("catalogue_import_job_items").select("id", { count: "exact", head: true }).eq("job_id", job.id).eq("status", "imported"),
    db.from("catalogue_import_job_items").select("id", { count: "exact", head: true }).eq("job_id", job.id).eq("status", "failed"),
    db.from("catalogue_import_job_items").select("id", { count: "exact", head: true }).eq("job_id", job.id).in("status", ["pending", "processing"]),
  ]);
  const importedCount = done.count ?? 0;
  const failedCount = failed.count ?? 0;
  const pendingCount = stillPending.count ?? 0;
  const status = pendingCount > 0 ? "processing" : failedCount > 0 ? (importedCount > 0 ? "partial" : "failed") : "completed";
  await db.from("catalogue_import_jobs").update({
    status, processed_items: importedCount + failedCount, imported_items: importedCount,
    failed_items: failedCount, updated_at: new Date().toISOString(),
  }).eq("id", job.id);
  return json({ status, imported: importedCount, failed: failedCount, pending: pendingCount, results });
}
