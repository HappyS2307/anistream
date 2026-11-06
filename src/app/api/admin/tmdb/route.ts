import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

const IMAGE = "https://image.tmdb.org/t/p/";
const headers = () => ({ Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN ?? ""}`, accept: "application/json" });
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function tmdb(path: string) {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB is not configured. Add TMDB_API_READ_ACCESS_TOKEN to Vercel environment variables.");
  const response = await fetch(`https://api.themoviedb.org/3${path}`, { headers: headers(), next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(response.status === 404 ? "TMDB title not found." : `TMDB request failed (${response.status}).`);
  return response.json();
}

export async function GET(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content admin access required." }, access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const kind = url.searchParams.get("kind") ?? "anime";
  const id = url.searchParams.get("id");
  if (!["anime", "drama", "web_series", "movie"].includes(kind)) return json({ error: "Invalid content category." }, 400);
  const media = kind === "movie" ? "movie" : "tv";
  try {
    if (id) {
      if (!/^\d+$/.test(id)) return json({ error: "Invalid TMDB ID." }, 400);
      const detail = await tmdb(`/${media}/${id}?language=en-US&append_to_response=videos,content_ratings`);
      const trailer = detail.videos?.results?.find((v: {site:string;type:string;official?:boolean;key:string}) => v.site === "YouTube" && v.type === "Trailer" && v.official) ?? detail.videos?.results?.find((v: {site:string;type:string;key:string}) => v.site === "YouTube" && v.type === "Trailer");
      const firstAir = detail.first_air_date ?? detail.release_date ?? "";
      const status = media === "tv" ? (detail.status === "Ended" || detail.status === "Canceled" ? "completed" : detail.status === "Returning Series" ? "ongoing" : "upcoming") : (firstAir && firstAir > new Date().toISOString().slice(0,10) ? "upcoming" : "completed");
      const rating = Number(detail.vote_average ?? 0);
      return json({ item: {
        tmdb_id: detail.id, title: detail.title ?? detail.name ?? "", original_title: detail.original_title ?? detail.original_name ?? "",
        synopsis: detail.overview ?? "", poster_url: detail.poster_path ? IMAGE + "w500" + detail.poster_path : "",
        banner_url: detail.backdrop_path ? IMAGE + "w1280" + detail.backdrop_path : "",
        release_date: firstAir || null, release_year: firstAir ? Number(firstAir.slice(0,4)) : null,
        end_date: detail.last_air_date || null, rating: rating ? Math.round(rating * 10) / 10 : null,
        genres: (detail.genres ?? []).map((g: {name:string}) => g.name),
        tags: [], studios: (detail.production_companies ?? []).map((c: {name:string}) => c.name),
        country_codes: detail.origin_country ?? detail.production_countries?.map((c: {iso_3166_1:string}) => c.iso_3166_1) ?? [],
        language_codes: detail.spoken_languages?.map((l: {iso_639_1:string}) => l.iso_639_1).filter(Boolean) ?? (detail.original_language ? [detail.original_language] : []),
        content_status: status, runtime_minutes: detail.runtime ?? detail.episode_run_time?.[0] ?? null,
        total_episodes: detail.number_of_episodes ?? null,
        trailer_url: trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : "",
        seasons: (detail.seasons ?? []).filter((s: {season_number:number}) => s.season_number > 0).map((s: {season_number:number;name:string;episode_count:number;air_date:string}) => ({ season_number:s.season_number, title:s.name, episode_count:s.episode_count, air_date:s.air_date })),
        tmdb_url: `https://www.themoviedb.org/${media}/${detail.id}`
      } });
    }
    if (!q) return json({ results: [] });
    const data = await tmdb(`/search/${media}?query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`);
    return json({ results: (data.results ?? []).slice(0, 8).map((item: Record<string, unknown>) => ({
      id: item.id, title: item.title ?? item.name, original_title: item.original_title ?? item.original_name,
      overview: item.overview, poster_url: item.poster_path ? IMAGE + "w342" + item.poster_path : "",
      release_date: item.release_date ?? item.first_air_date ?? "", rating: item.vote_average ?? 0,
      media_type: media
    })) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "TMDB lookup failed." }, 502);
  }
}
