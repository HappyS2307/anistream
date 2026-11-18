import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

export const maxDuration = 60;
const IMAGE = "https://image.tmdb.org/t/p/";
const reply = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

async function tmdb(path: string) {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB_API_READ_ACCESS_TOKEN is not configured.");
  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    signal: AbortSignal.timeout(12000), cache: "no-store",
  });
  if (!response.ok) throw new Error(`TMDB request failed (${response.status}).`);
  return response.json();
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function POST(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return reply({ error: "Content management access required." },
    access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return reply({ error: "Request is too large." }, 413);
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch { return reply({ error: "Invalid JSON request." }, 400); }

  const id = Number(body.tmdb_id);
  const kind = body.kind;
  if (!Number.isSafeInteger(id) || id < 1 || !["anime", "drama", "web_series", "movie"].includes(String(kind))) {
    return reply({ error: "Valid TMDB ID and category are required." }, 400);
  }

  try {
    const media = kind === "movie" ? "movie" : "tv";
    const detail = await tmdb(`/${media}/${id}?language=en-US&append_to_response=videos,content_ratings`);
    const seasons = media === "tv"
      ? (detail.seasons ?? []).filter((season: { season_number: number }) => season.season_number > 0).slice(0, 30)
      : [];
    const seasonDetails = await mapWithConcurrency(seasons, 4, async (season: { season_number: number; name: string; overview: string }) => {
      const data = await tmdb(`/tv/${id}/season/${season.season_number}?language=en-US`);
      const episodes = (data.episodes ?? []).slice(0, 300).map((episode: Record<string, unknown>) => ({
        episode_number: Number(episode.episode_number),
        title: String(episode.name ?? `Episode ${episode.episode_number}`).slice(0, 180),
        synopsis: String(episode.overview ?? "").slice(0, 5000),
      })).filter((episode: { episode_number: number }) => Number.isInteger(episode.episode_number) && episode.episode_number > 0);
      return { season_number: Number(season.season_number), title: String(data.name ?? season.name ?? "").slice(0, 180),
        synopsis: String(data.overview ?? season.overview ?? "").slice(0, 5000), episodes };
    });
    const firstDate = String(detail.first_air_date ?? detail.release_date ?? "");
    const trailer = detail.videos?.results?.find((video: {site:string;type:string;official?:boolean;key:string}) =>
      video.site === "YouTube" && video.type === "Trailer" && video.official)
      ?? detail.videos?.results?.find((video: {site:string;type:string;key:string}) => video.site === "YouTube" && video.type === "Trailer");
    const payload = {
      tmdb_id: id, kind, title: String(detail.title ?? detail.name ?? "").slice(0, 240),
      original_title: String(detail.original_title ?? detail.original_name ?? "").slice(0, 240),
      synopsis: String(detail.overview ?? "").slice(0, 10000),
      poster_url: detail.poster_path ? IMAGE + "w500" + detail.poster_path : "",
      banner_url: detail.backdrop_path ? IMAGE + "w1280" + detail.backdrop_path : "",
      release_date: /^\d{4}-\d{2}-\d{2}$/.test(firstDate) ? firstDate : null,
      release_year: /^\d{4}/.test(firstDate) ? Number(firstDate.slice(0, 4)) : null,
      end_date: detail.last_air_date || null,
      rating: Number(detail.vote_average) > 0 ? Math.round(Number(detail.vote_average) * 10) / 10 : null,
      genres: (detail.genres ?? []).map((item: {name:string}) => item.name).slice(0, 30),
      studios: (detail.production_companies ?? []).map((item: {name:string}) => item.name).slice(0, 30),
      country_codes: (detail.origin_country ?? detail.production_countries?.map((item: {iso_3166_1:string}) => item.iso_3166_1) ?? []).slice(0, 20),
      language_codes: (detail.spoken_languages ?? []).map((item: {iso_639_1:string}) => item.iso_639_1).filter(Boolean).slice(0, 20),
      content_status: detail.status === "Returning Series" ? "ongoing" :
        ["Ended", "Canceled", "Released"].includes(String(detail.status)) ? "completed" :
        firstDate > new Date().toISOString().slice(0, 10) ? "upcoming" : "ongoing",
      runtime_minutes: detail.runtime ?? detail.episode_run_time?.[0] ?? null,
      total_episodes: detail.number_of_episodes ?? null,
      trailer_url: trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : "",
    };
    if (!payload.title) return reply({ error: "TMDB returned no title." }, 502);
    const rpc = access.client.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{data: unknown;error: {message:string;code?:string}|null}>;
    const result = await rpc("import_tmdb_catalogue", { p_content: payload, p_seasons: seasonDetails });
    if (result.error) return reply({ error: result.error.code === "42501" ? "Import permission denied." : "Catalogue import failed. Check that the latest Supabase migration has been applied." }, 400);
    return reply({ imported: result.data, title: payload.title, tmdb_id: id }, 200);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Catalogue import failed." }, 502);
  }
}
