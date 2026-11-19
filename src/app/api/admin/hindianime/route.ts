import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const records = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];
const firstString = (...values: unknown[]): string | null => {
  const value = values.find((item) => typeof item === "string" && item.trim().length > 0);
  return typeof value === "string" ? value.trim() : null;
};
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

    const responseValue: unknown = await response.json();
    if (!isRecord(responseValue)) return json({ available: false, error: "HindiAnime returned an invalid response." }, 502);
    const data = [responseValue.series, responseValue.movie, responseValue.item, responseValue.result, responseValue]
      .find(isRecord) ?? responseValue;
    const seasons = records(data.seasons);
    const episodes = [
      ...records(data.episodes),
      ...seasons.flatMap((season) => records(season.episodes)),
    ];
    const sources = [
      ...records(data.sources),
      ...episodes.flatMap((episode) => records(episode.sources)),
    ];
    const audioOptions = [...new Set(sources.map((source) =>
      firstString(source.language, source.audio, source.name, source.label)
    ).filter((value): value is string => value !== null))];
    const hasPlayerUrls = Boolean(firstString(data.player_url, data.playerUrl))
      || episodes.some((episode) => Boolean(firstString(episode.player_url, episode.playerUrl)));

    return json({
      available: responseValue.success !== false,
      title: firstString(data.title, data.name, responseValue.title),
      tmdb_id: id,
      kind,
      season_count: seasons.length,
      episode_count: episodes.length,
      audio_options: audioOptions,
      has_player_urls: hasPlayerUrls,
    });
  } catch (error) {
    return json({ available: false, error: error instanceof Error ? error.message : "HindiAnime lookup failed." }, 502);
  }
}
