import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});
const positive = (value: unknown) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

function extractUrls(value: unknown, inheritedSeason: number | null = null, inheritedEpisode: number | null = null) {
  const found: Array<{ url: string; season: number | null; episode: number | null; language: string | null; quality: string | null }> = [];
  const visited = new Set<object>();
  const urlKeys = ["player_url", "playerUrl", "embed_url", "embedUrl", "iframe_url", "iframeUrl", "url", "link", "src"];
  const languageKeys = ["language", "audio", "audio_language", "audioLanguage", "lang", "label"];
  const qualityKeys = ["quality", "resolution"];
  function walk(node: unknown, season: number | null, episode: number | null, depth: number) {
    if (depth > 12 || !node || typeof node !== "object" || visited.has(node as object)) return;
    visited.add(node as object);
    if (Array.isArray(node)) { for (const item of node.slice(0, 500)) walk(item, season, episode, depth + 1); return; }
    const record = node as RecordValue;
    const ownSeason = positive(record.season_number ?? record.seasonNumber ?? record.season) ?? season;
    const ownEpisode = positive(record.episode_number ?? record.episodeNumber ?? record.episode) ?? episode;
    const language = Object.entries(record).find(([key, item]) => languageKeys.includes(key) && typeof item === "string")?.[1];
    const quality = Object.entries(record).find(([key, item]) => qualityKeys.includes(key) && typeof item === "string")?.[1];
    for (const key of urlKeys) {
      const candidate = record[key];
      if (typeof candidate === "string" && /^https:\/\//i.test(candidate.trim())) {
        found.push({ url: candidate.trim(), season: ownSeason, episode: ownEpisode,
          language: typeof language === "string" ? language.slice(0, 40) : null,
          quality: typeof quality === "string" ? quality.slice(0, 40) : null });
      }
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "url" || key === "link" || key === "src" || key === "player_url" || key === "playerUrl" || key === "embed_url" || key === "embedUrl" || key === "iframe_url" || key === "iframeUrl") continue;
      walk(child, ownSeason, ownEpisode, depth + 1);
    }
  }
  walk(value, inheritedSeason, inheritedEpisode, 0);
  return found;
}

function validateAgainstServer(value: string, hostname: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      url.hostname.toLowerCase().replace(/\.$/, "") === hostname.toLowerCase().replace(/\.$/, "") &&
      value.length <= 4096 ? url.toString() : null;
  } catch { return null; }
}

async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = new Array(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) { const index = cursor++; if (index >= items.length) return; output[index] = await task(items[index]); }
  }));
  return output;
}

async function providerJson(path: string) {
  const base = process.env.HINDIANIME_WORKER_URL;
  const key = process.env.HINDIANIME_API_KEY;
  if (!base || !key) throw new Error("HindiAnime Worker URL or API key is not configured.");
  const response = await fetch(new URL(path, base), {
    headers: { accept: "application/json", "x-api-key": key },
    cache: "no-store", signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(response.status === 404 ? "Provider has no playback record for this item." : `Provider returned HTTP ${response.status}.`);
  return response.json() as Promise<unknown>;
}

export async function POST(request: Request) {
  const access = await getAdminAccess("links.import");
  if (access.status !== "authorized") return json({ error: "Episode link-import permission required." },
    access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  let body: RecordValue;
  try { body = await request.json() as RecordValue; } catch { return json({ error: "Invalid JSON request." }, 400); }
  const tmdbId = positive(body.tmdb_id);
  const kind = body.kind === "movie" ? "movie" : ["anime", "drama", "web_series"].includes(String(body.kind)) ? String(body.kind) : null;
  const offset = Number.isSafeInteger(body.offset) && Number(body.offset) >= 0 ? Number(body.offset) : 0;
  const limit = Number.isSafeInteger(body.limit) ? Math.min(25, Math.max(1, Number(body.limit))) : 20;
  if (!tmdbId || !kind) return json({ error: "A valid TMDB ID and content category are required." }, 400);

  const [contentResult, serversResult] = await Promise.all([
    access.client.from("content").select("id,tmdb_id,kind,title").eq("tmdb_id", tmdbId).maybeSingle(),
    access.client.from("streaming_servers").select("id,name,hostname").eq("enabled", true),
  ]);
  if (contentResult.error || !contentResult.data) return json({ error: "Import the TMDB title and episodes before importing provider links." }, 404);
  if (serversResult.error) return json({ error: "Could not load enabled streaming servers." }, 503);
  const servers = serversResult.data ?? [];
  if (!servers.length) return json({ error: "No enabled streaming servers are configured. Add and enable the exact provider player hostname in Streaming servers first." }, 409);
  const content = contentResult.data;

  try {
    if (kind === "movie") {
      if (offset > 0) return json({ done: true, offset, next_offset: null, total: 1, processed: 0, imported: 0, skipped: 0, failed: 0 });
      const payload = await providerJson(`/v1/hindianime/playback/movie/${tmdbId}`);
      const candidates = extractUrls(payload);
      const matched = candidates.flatMap(candidate => servers.flatMap(server => {
        const url = validateAgainstServer(candidate.url, server.hostname);
        return url ? [{ url, serverId: server.id, serverName: server.name }] : [];
      }));
      let imported = 0, skipped = 0;
      for (const item of matched) {
        const result = await access.client.from("streaming_sources").insert({
          content_id: content.id, server_id: item.serverId, embed_url: item.url, created_by: access.userId,
        });
        if (result.error?.code === "23505") skipped++;
        else if (result.error) return json({ error: "A validated provider link could not be saved.", imported, skipped }, 500);
        else imported++;
      }
      await access.client.from("import_history").insert({
        actor_id: access.userId, import_kind: "stream", status: "completed",
        records_total: matched.length, records_imported: imported, records_skipped: skipped, records_failed: 0,
      });
      return json({ done: true, total: 1, processed: 1, imported, skipped, failed: candidates.length - matched.length,
        unsupported: candidates.length - matched.length, message: matched.length ? "Movie playback links checked against enabled server hostnames." : "No provider URL matched an enabled streaming server." });
    }

    const { data: seasons, error: seasonError } = await access.client.from("seasons")
      .select("id,season_number").eq("content_id", content.id).order("season_number");
    if (seasonError) return json({ error: "Could not load imported seasons." }, 503);
    const seasonIds = (seasons ?? []).map(item => item.id);
    const { data: episodes, error: episodeError } = seasonIds.length
      ? await access.client.from("episodes").select("id,season_id,episode_number").in("season_id", seasonIds).order("episode_number")
      : { data: [], error: null };
    if (episodeError) return json({ error: "Could not load imported episodes." }, 503);
    const seasonById = new Map((seasons ?? []).map(item => [item.id, item.season_number]));
    const ordered = (episodes ?? []).map(item => ({ ...item, seasonNumber: seasonById.get(item.season_id) ?? null }))
      .sort((a,b) => (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0) || a.episode_number - b.episode_number);
    if (!ordered.length) return json({ error: "No imported episode records found. Run the TMDB import first." }, 409);
    const batch = ordered.slice(offset, offset + limit);
    if (!batch.length) return json({ done: true, total: ordered.length, processed: 0, imported: 0, skipped: 0, failed: 0, next_offset: null });

    const outcomes = await mapLimit(batch, 4, async episode => {
      try {
        const payload = await providerJson(`/v1/hindianime/playback/series/${tmdbId}/${episode.seasonNumber}-${episode.episode_number}`);
        const candidates = extractUrls(payload, episode.seasonNumber, episode.episode_number);
        const valid = candidates.flatMap(candidate => {
          if (candidate.season !== episode.seasonNumber || candidate.episode !== episode.episode_number) return [];
          return servers.flatMap(server => {
            const url = validateAgainstServer(candidate.url, server.hostname);
            return url ? [{ url, serverId: server.id }] : [];
          });
        });
        return { episodeId: episode.id, candidates: candidates.length, valid, error: null as string | null };
      } catch (error) {
        return { episodeId: episode.id, candidates: 0, valid: [], error: error instanceof Error ? error.message : "Provider lookup failed." };
      }
    });

    let imported = 0, skipped = 0, failed = 0, unsupported = 0;
    for (const outcome of outcomes) {
      if (outcome.error) { failed++; continue; }
      if (!outcome.valid.length) { if (outcome.candidates) unsupported++; else failed++; continue; }
      for (const item of outcome.valid) {
        const saved = await access.client.from("streaming_sources").insert({
          episode_id: outcome.episodeId, server_id: item.serverId, embed_url: item.url, created_by: access.userId,
        });
        if (saved.error?.code === "23505") skipped++;
        else if (saved.error) failed++;
        else imported++;
      }
    }
    const nextOffset = offset + batch.length < ordered.length ? offset + batch.length : null;
    const total = imported + skipped + failed + unsupported;
    await access.client.from("import_history").insert({
      actor_id: access.userId, import_kind: "stream",
      status: failed || unsupported ? (imported + skipped ? "partial" : "failed") : "completed",
      records_total: total, records_imported: imported, records_skipped: skipped, records_failed: failed + unsupported,
    });
    return json({ done: nextOffset === null, total: ordered.length, processed: batch.length, offset,
      next_offset: nextOffset, imported, skipped, failed, unsupported,
      message: "Only HTTPS player URLs whose hostname exactly matches an enabled Streaming server were saved. Existing links were not overwritten." });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "HindiAnime playback import failed." }, 502);
  }
}
