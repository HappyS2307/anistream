import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

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
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.HINDIANIME_API_KEY) headers["x-api-key"] = process.env.HINDIANIME_API_KEY;
    const response = await fetch(endpoint, { headers, cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) return json({ available: false, error: response.status === 404 ? "No HindiAnime match found." : `HindiAnime provider returned ${response.status}.` }, response.status === 404 ? 200 : 502);
    const responseData = await response.json() as Record<string, any>;
    const data = (responseData.series ?? responseData.movie ?? responseData.item ?? responseData.result ?? responseData) as Record<string, any>;
    const seasons = Array.isArray(data.seasons) ? data.seasons : [];
    const episodes = Array.isArray(data.episodes) ? data.episodes : seasons.flatMap((season: any) => Array.isArray(season.episodes) ? season.episodes : []);
    const sources = [
      ...(Array.isArray(data.sources) ? data.sources : []),
      ...episodes.flatMap((episode: any) => Array.isArray(episode.sources) ? episode.sources : []),
    ];
    const audioOptions = [...new Set(sources.map((source: any) =>
      String(source.language ?? source.audio ?? source.name ?? source.label ?? "").trim()
    ).filter(Boolean))];
    return json({
      available: responseData.success !== false,
      title: data.title ?? data.name ?? responseData.title ?? null,
      tmdb_id: id,
      kind,
      season_count: seasons.length,
      episode_count: episodes.length,
      audio_options: audioOptions,
      has_player_urls: Boolean(data.player_url ?? data.playerUrl) || episodes.some((episode: any) => Boolean(episode.player_url ?? episode.playerUrl)),
    });
  } catch (error) {
    return json({ available: false, error: error instanceof Error ? error.message : "HindiAnime lookup failed." }, 502);
  }
}
