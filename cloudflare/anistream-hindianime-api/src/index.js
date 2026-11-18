const UPSTREAM = "https://hindianime.de5.net";
const ALLOWED_ORIGINS = new Set([
  "https://anistream-liart-phi.vercel.app",
  "http://localhost:3000",
]);

function json(body, status = 200, origin = "") {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function resolveUpstreamPath(path, search) {
  if (path === "/v1/hindianime/stats") return "/api/stats";
  if (path === "/v1/hindianime/search") {
    const query = (search.get("q") || "").trim();
    if (!query || query.length > 120) return null;
    return "/api/search?q=" + encodeURIComponent(query);
  }

  let match = path.match(/^\/v1\/hindianime\/series\/(\d{1,12})$/);
  if (match) return "/api/series/" + match[1];

  match = path.match(/^\/v1\/hindianime\/movies\/(\d{1,12})$/);
  if (match) return "/api/playback/movie/" + match[1];

  match = path.match(/^\/v1\/hindianime\/playback\/movie\/(\d{1,12})$/);
  if (match) return "/api/playback/movie/" + match[1];

  match = path.match(/^\/v1\/hindianime\/playback\/series\/(\d{1,12})\/(\d{1,4})-(\d{1,4})$/);
  if (match) return "/api/playback/series/" + match[1] + "/" + match[2] + "-" + match[3];

  return undefined;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";

    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type, x-api-key",
          "access-control-max-age": "86400",
          vary: "Origin",
        },
      });
    }

    if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, origin);
    if (url.pathname === "/health") return json({ ok: true, service: "anistream-hindianime-api" }, 200, origin);

    if (!env.API_KEY || request.headers.get("x-api-key") !== env.API_KEY) {
      return json({ error: "Unauthorized." }, 401, origin);
    }

    const upstreamPath = resolveUpstreamPath(url.pathname, url.searchParams);
    if (upstreamPath === undefined) return json({ error: "Not found." }, 404, origin);
    if (upstreamPath === null) return json({ error: "A valid search query is required." }, 400, origin);

    try {
      const response = await fetch(UPSTREAM + upstreamPath, {
        headers: {
          accept: "application/json",
          "user-agent": "AniStream-Provider-Adapter/1.0",
        },
        signal: AbortSignal.timeout(10000),
        cf: { cacheTtl: 45, cacheEverything: true },
      });

      if (!(response.headers.get("content-type") || "").includes("application/json")) {
        return json({ error: "Provider returned a non-JSON response." }, 502, origin);
      }

      return json(await response.json(), response.status, origin);
    } catch {
      return json({ error: "HindiAnime provider is temporarily unavailable." }, 502, origin);
    }
  },
};
