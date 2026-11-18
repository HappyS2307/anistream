import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

export const maxDuration = 60;
const json = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});
const allowedKinds = ["anime", "drama", "web_series", "movie"] as const;

export async function POST(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content management access required." },
    access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 300_000) return json({ error: "Request exceeds the 300 KB limit." }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: "Invalid JSON request." }, 400); }

  if (typeof body.kind !== "string" || !allowedKinds.includes(body.kind as typeof allowedKinds[number])) return json({ error: "Invalid content category." }, 400);
  const kind = body.kind as typeof allowedKinds[number];
  if (!Array.isArray(body.tmdb_ids) || body.tmdb_ids.length < 1 || body.tmdb_ids.length > 5000) {
    return json({ error: "Provide between 1 and 5000 TMDB IDs." }, 400);
  }
  const ids = [...new Set(body.tmdb_ids.map(Number))];
  if (ids.some(id => !Number.isSafeInteger(id) || id < 1)) return json({ error: "Every TMDB ID must be a positive integer." }, 400);

  const db = access.client;
  const job = await db.from("catalogue_import_jobs").insert({
    actor_id: access.userId, kind, total_items: ids.length, status: "queued",
  }).select("id").single();
  if (job.error || !job.data) return json({ error: "Could not create import job. Apply the catalogue jobs migration first." }, 400);

  const rows = ids.map(tmdb_id => ({ job_id: job.data.id, tmdb_id }));
  const inserted = await db.from("catalogue_import_job_items").insert(rows);
  if (inserted.error) {
    await db.from("catalogue_import_jobs").delete().eq("id", job.data.id);
    return json({ error: "Could not create import job items." }, 400);
  }
  return json({ job_id: job.data.id, total_items: ids.length, status: "queued" }, 201);
}

export async function GET(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content management access required." },
    access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  const id = new URL(request.url).searchParams.get("job_id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "A valid job_id is required." }, 400);
  const db = access.client;
  const [job, items] = await Promise.all([
    db.from("catalogue_import_jobs").select("*").eq("id", id).eq("actor_id", access.userId).maybeSingle(),
    db.from("catalogue_import_job_items").select("tmdb_id,status,error_message,attempts").eq("job_id", id).order("tmdb_id"),
  ]);
  if (job.error || items.error) return json({ error: "Could not load import job." }, 400);
  if (!job.data) return json({ error: "Import job not found." }, 404);
  return json({ job: job.data, items: items.data ?? [] });
}
