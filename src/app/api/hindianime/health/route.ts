import { NextResponse } from "next/server";

type ProviderStats = {
  status?: unknown;
  movies?: unknown;
  series?: unknown;
  total_episodes?: unknown;
  active_streams?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function GET(request: Request) {
  const base = process.env.HINDIANIME_WORKER_URL;
  if (!base) {
    return NextResponse.json({ ok: false, service: "hindianime", error: "Provider adapter is not configured." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const url = new URL(request.url);
    const providerProbe = url.searchParams.get("provider") === "1";
    const headers: Record<string, string> = { accept: "application/json" };
    if (providerProbe && process.env.HINDIANIME_API_KEY) {
      headers["x-api-key"] = process.env.HINDIANIME_API_KEY;
    }

    const endpoint = providerProbe
      ? new URL("/v1/hindianime/stats", base)
      : new URL("/health", base);
    const response = await fetch(endpoint, {
      headers,
      cache: providerProbe ? "force-cache" : "no-store",
      ...(providerProbe ? { next: { revalidate: 60 } } : {}),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        service: "hindianime",
        provider: providerProbe ? "unavailable" : undefined,
        error: providerProbe
          ? "HindiAnime provider stats request failed."
          : "Provider adapter health check failed.",
      }, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload)) {
      return NextResponse.json({ ok: false, service: "hindianime", error: "Provider adapter returned an invalid response." }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (!providerProbe) {
      if (payload.ok !== true) {
        return NextResponse.json({ ok: false, service: "hindianime", error: "Provider adapter returned an invalid health response." }, {
          status: 502,
          headers: { "Cache-Control": "no-store" },
        });
      }
      return NextResponse.json({ ok: true, service: "hindianime" }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const stats = payload as ProviderStats;
    const count = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
    const movies = count(stats.movies);
    const series = count(stats.series);
    const episodes = count(stats.total_episodes);
    const activeStreams = count(stats.active_streams);

    if (stats.status !== "ok" || movies === null || series === null || episodes === null) {
      return NextResponse.json({
        ok: false,
        service: "hindianime",
        provider: "invalid-response",
        error: "HindiAnime returned an unexpected stats response.",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({
      ok: true,
      service: "hindianime",
      provider: "online",
      stats: {
        movies,
        series,
        total_episodes: episodes,
        active_streams: activeStreams,
      },
    }, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({
      ok: false,
      service: "hindianime",
      provider: "unreachable",
      error: "Provider adapter is unreachable.",
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
