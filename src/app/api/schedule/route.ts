import { NextResponse } from "next/server";

const IMAGE = "https://image.tmdb.org/t/p/";
export async function GET() {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "Anime schedule is temporarily unavailable." }, { status: 503 });
  const today = new Date().toISOString().slice(0, 10);
  try {
    const params = new URLSearchParams({
      language: "en-US", with_genres: "16", with_original_language: "ja",
      "first_air_date.gte": today, sort_by: "first_air_date.asc", page: "1",
      include_adult: "false",
    });
    const response = await fetch(`https://api.themoviedb.org/3/discover/tv?${params}`, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
      next: { revalidate: 1800 }, signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("TMDB schedule request failed.");
    const data = await response.json();
    const items = (data.results ?? []).slice(0, 40).map((item: Record<string, unknown>) => ({
      id: item.id, title: item.name ?? item.original_name ?? "Untitled",
      overview: item.overview ?? "", poster_url: item.poster_path ? IMAGE + "w342" + item.poster_path : "",
      backdrop_url: item.backdrop_path ? IMAGE + "w780" + item.backdrop_path : "",
      first_air_date: item.first_air_date ?? null, rating: Number(item.vote_average ?? 0),
      tmdb_url: `https://www.themoviedb.org/tv/${item.id}`,
    }));
    return NextResponse.json({ items, updated_at: new Date().toISOString() }, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Could not load the upcoming anime schedule." }, { status: 502 });
  }
}
