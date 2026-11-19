# AniStream HindiAnime API Worker

This Worker is a narrow server-side adapter for the existing HindiAnime API. It is separate from the Anime Mitraa and Nxsha Workers.

## Routes

- `GET /health` — public health check
- `GET /v1/hindianime/stats`
- `GET /v1/hindianime/search?q=...`
- `GET /v1/hindianime/series/:tmdbId`
- `GET /v1/hindianime/movies/:tmdbId` — uses the provider's movie playback metadata endpoint
- `GET /v1/hindianime/playback/movie/:tmdbId`
- `GET /v1/hindianime/playback/series/:tmdbId/:season-:episode`

All data routes require the `x-api-key` header. The Worker only forwards fixed, validated GET routes to `https://hindianime.de5.net`; it is not an arbitrary URL proxy and does not extract media streams.

## Configure and deploy

1. Install Wrangler and authenticate to the Cloudflare account `crunchyrollhindianime`.
2. From this directory run `npx wrangler secret put API_KEY` and enter a long random value.
3. Deploy with `npx wrangler deploy`.
4. Set the same value as encrypted `HINDIANIME_API_KEY` in the AniStream Vercel project.
5. Set `HINDIANIME_WORKER_URL` to the Worker URL in AniStream Vercel, then redeploy.

The Worker has been deployed to `https://anistream-hindianime-api.crunchyrollhindianime.workers.dev`. Its `API_KEY` secret binding is configured in Cloudflare, and the matching encrypted `HINDIANIME_API_KEY` plus `HINDIANIME_WORKER_URL` variables are configured for AniStream Preview and Production in Vercel. A fresh Preview redeployment is running to load these environment variables. Do not remove API-key validation or expose the provider proxy without authentication.

## Security and limitations

- GET-only, fixed upstream host, strict route patterns, bounded search input, timeout, JSON response validation.
- CORS is restricted to the AniStream production origin and localhost development.
- Provider availability, rate limits, and terms are not guaranteed by this adapter.
- The adapter reports metadata and player URL presence; it does not create streaming-source records or bypass provider controls.
