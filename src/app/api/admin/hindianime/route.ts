import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function GET(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content management access required." },
    access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("tmdb_id"));
  const kind = url.searchParams.get("kind") ?? "anime";
  if (!Number.isSafeInteger(id) || id < 1 || !["anime", "drama", "web_series", "movie"].includes(kind)) {
    return json({ error: "Valid TMDB ID and category are required." }, 400);
  }
  const base = process.env.HINDIANIME_WORKER_URL;
  if (!base) return json({ error: "HindiAnime Worker is not configured. Set HINDIANIME_WORKER_URL." }, 503);
  try {
    const media = kind === "movie" ? "movies" : "series";
    const endpoint = new URL(`/v1/hindianime/${media}/${id}`, base);
    const headers: HeadersInit = { accept: "application/json" };
    if (process.env.HINDIANIME_API_KEY) headers["x-api-key"] = process.env.HINDIANIME_API_KEY;
    const response = await fetch(endpoint, { headers, cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) return json({ available: false, error: response.status === 404 ? "No HindiAnime match found." : `HindiAnime provider returned ${response.status}.` }, response.status === 404 ? 200 : 502);
    const data = await response.json() as Record<string, unknown>;
    const episodes = Array.isArray(data.episodes) ? data.episodes : [];
    const seasons = Array.isArray(data.seasons) ? data.seasons : [];
    const sources = Array.isArray(data.sources) ? data.sources : [];
    return json({
      available: true,
      title: data.title ?? data.name ?? null,
      tmdb_id: id,
      kind,
      season_count: seasons.length,
      episode_count: episodes.length,
      audio_options: [...new Set(sources.map((source: any) => String(source.language ?? source.audio ?? source.name ?? "")).filter(Boolean))],
      has_player_urls: Boolean(data.player_url) || episodes.some((episode: any) => Boolean(episode.player_url)),
      detail: data,
    });
  } catch (error) {
    return json({ available: false, error: error instanceof Error ? error.message : "HindiAnime lookup failed." }, 502);
  }
}
