import { NextResponse } from "next/server";
import {
  MAX_IMPORT_RECORDS,
  validateImportRows,
} from "@/lib/admin/bulk-link-import.mjs";
import { getAdminAccess, getLinkImportContext } from "@/lib/data/admin";


type NormalizedImport = {
  contentId: string | null;
  episodeId: string | null;
  serverId: string;
  providerId: string;
  url: string;
  quality: string;
  audioLanguage: string;
};

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const access = await getAdminAccess("links.import");

  if (access.status === "unconfigured") return jsonError(503, "Authentication is not configured.");
  if (access.status === "unauthenticated") return jsonError(401, "Sign in is required.");
  if (access.status === "forbidden") return jsonError(403, "You do not have permission to import links.");
  if (access.status !== "authorized") return jsonError(503, "Admin access is unavailable.");

  let payload: unknown;
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 1_100_000) return jsonError(413, "Request body exceeds the 1 MB limit.");
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 1_100_000) {
      return jsonError(413, "Request body exceeds the 1 MB limit.");
    }
    payload = JSON.parse(rawBody);
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError(400, "Request body must be an object.");
  }

  const body = payload as Record<string, unknown>;
  const kind = body.kind;
  if (kind !== "stream" && kind !== "download") {
    return jsonError(400, "Choose stream or download import.");
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return jsonError(400, "Provide at least one import row.");
  }
  if (body.rows.length > MAX_IMPORT_RECORDS) {
    return jsonError(413, `Imports are limited to ${MAX_IMPORT_RECORDS} records.`);
  }

  const rows = body.rows.map((item, index) => {
    const row = item && typeof item === "object" && !Array.isArray(item)
      ? item as Record<string, unknown>
      : {};
    return {
      row: Number.isInteger(row.row) && Number(row.row) > 0 ? Number(row.row) : index + 1,
      contentSlug: safeText(row.contentSlug),
      seasonNumber: row.seasonNumber === null || row.seasonNumber === undefined || row.seasonNumber === ""
        ? null
        : Number(row.seasonNumber),
      episodeNumber: row.episodeNumber === null || row.episodeNumber === undefined || row.episodeNumber === ""
        ? null
        : Number(row.episodeNumber),
      kind,
      serverName: safeText(row.serverName),
      providerName: safeText(row.providerName),
      quality: safeText(row.quality),
      audioLanguage: safeText(row.audioLanguage),
      url: safeText(row.url),
    };
  });

  const contextResult = await getLinkImportContext([...new Set(rows.map((row) => row.contentSlug))]);
  if (contextResult.status !== "ready") {
    if (contextResult.status === "forbidden") return jsonError(403, "You do not have permission to import links.");
    if (contextResult.status === "unauthenticated") return jsonError(401, "Sign in is required.");
    return jsonError(503, "Import data is unavailable.");
  }

  const validation = validateImportRows(rows, contextResult.context, kind);
  const results = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const result of validation) {
    if (result.status === "rejected") {
      results.push({ row: result.row, status: "failed", message: result.message });
      failed += 1;
      continue;
    }
    if (result.status === "skipped") {
      results.push({ row: result.row, status: "skipped", message: result.message });
      skipped += 1;
      continue;
    }

    const normalized = result.normalized as NormalizedImport | null;
    if (!normalized) {
      results.push({ row: result.row, status: "failed", message: "The row could not be normalized." });
      failed += 1;
      continue;
    }

    const insertResult = kind === "stream"
      ? await contextResult.client.from("streaming_sources").insert({
          content_id: normalized.contentId,
          episode_id: normalized.episodeId,
          server_id: normalized.serverId,
          embed_url: normalized.url,
          created_by: contextResult.userId,
        })
      : await contextResult.client.from("download_sources").insert({
          content_id: normalized.contentId,
          episode_id: normalized.episodeId,
          provider_id: normalized.providerId,
          download_url: normalized.url,
          quality: normalized.quality,
          audio_language: normalized.audioLanguage,
          created_by: access.userId,
        });

    if (insertResult.error?.code === "23505") {
      results.push({ row: result.row, status: "skipped", message: "This link already exists." });
      skipped += 1;
    } else if (insertResult.error) {
      results.push({ row: result.row, status: "failed", message: "Database rejected this link." });
      failed += 1;
    } else {
      results.push({ row: result.row, status: "imported", message: "Link imported successfully." });
      imported += 1;
    }
  }

  const total = imported + skipped + failed;
  const status = failed === 0 ? "completed" : imported + skipped > 0 ? "partial" : "failed";
  const history = await contextResult.client.from("import_history").insert({
    actor_id: contextResult.userId,
    import_kind: kind,
    status,
    records_total: total,
    records_imported: imported,
    records_skipped: skipped,
    records_failed: failed,
  });

  if (history.error) {
    return NextResponse.json({
      error: "Import finished, but the audit history could not be saved.",
      summary: { total, imported, skipped, failed },
      results,
    }, { status: 500 });
  }

  return NextResponse.json({
    summary: { total, imported, skipped, failed },
    results,
  }, { status: failed > 0 ? 207 : 200 });
}
