import { NextResponse } from "next/server";

type Row = Record<string, unknown>;
const isRow = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter(isRow) : [];
const firstText = (...values: unknown[]) => {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value.trim() : null;
};

export async function GET() {
  const base = process.env.HINDIANIME_WORKER_URL;
  const key = process.env.HINDIANIME_API_KEY;
  if (!base || !key) return NextResponse.json({ ok: false }, { status: 503 });

  try {
    const headers = { accept: "application/json", "x-api-key": key };
    const [seriesResponse, movieResponse] = await Promise.all([
      fetch(new URL("/v1/hindianime/series/46260", base), { headers, cache: "no-store", signal: AbortSignal.timeout(12000) }),
      fetch(new URL("/v1/hindianime/playback/movie/16907", base), { headers, cache: "no-store", signal: AbortSignal.timeout(12000) }),
    ]);
    const [seriesPayload, moviePayload]: unknown[] = await Promise.all([
      seriesResponse.json(), movieResponse.json(),
    ]);
    if (!seriesResponse.ok || !movieResponse.ok || !isRow(seriesPayload) || !isRow(moviePayload)) {
      return NextResponse.json({
        ok: false,
        series_status: seriesResponse.status,
        movie_status: movieResponse.status,
      }, { status: 502 });
    }

    const seriesData = [seriesPayload.series, seriesPayload.item, seriesPayload.result, seriesPayload.data, seriesPayload].find(isRow) ?? seriesPayload;
    const movieData = [moviePayload.movie, moviePayload.item, moviePayload.result, moviePayload.data, moviePayload].find(isRow) ?? moviePayload;
    const seasons = rows(seriesData.seasons);
    const episodes = [...rows(seriesData.episodes), ...seasons.flatMap((season) => rows(season.episodes))];
    const sources = [
      ...rows(movieData.sources),
      ...rows(movieData.audio_sources),
      ...rows(movieData.streams),
    ];
    return NextResponse.json({
      ok: true,
      series: {
        title: firstText(seriesData.title, seriesData.name),
        seasons: seasons.length,
        episodes: episodes.length,
        player_urls_present: Boolean(firstText(seriesData.player_url, seriesData.playerUrl)) ||
          episodes.some((episode) => Boolean(firstText(episode.player_url, episode.playerUrl))),
      },
      movie: {
        title: firstText(movieData.title, movieData.name),
        player_url_present: Boolean(firstText(movieData.player_url, movieData.playerUrl)),
        source_count: sources.length,
        audio_labels: [...new Set(sources.map((source) =>
          firstText(source.language, source.audio, source.name, source.label)
        ).filter((value): value is string => value !== null))],
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Provider detail probe failed." }, { status: 502 });
  }
}
