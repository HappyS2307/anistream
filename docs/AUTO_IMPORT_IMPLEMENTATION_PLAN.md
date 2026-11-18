# AniStream Auto-Import and Discovery Implementation Plan

**Status:** Phase 0 complete (repository inspection and isolated working branch). This document is a plan, not a claim that the integrations below are implemented or deployed.

## Goals

Build a fast, simple admin workflow for importing catalogue metadata and episodes, checking permitted third-party playback availability, and maintaining an upcoming/airing catalogue. Preserve existing manual content creation and existing playback/server management.

## Verified repository baseline

- Default branch: `main`; stack: Next.js App Router 16.4.3, React 19.3.0, TypeScript, Supabase SSR/client.
- Admin access is permission-checked server-side through `getAdminAccess` and the `has_admin_permission` database function.
- Content management already supports manual create/edit and TMDB search/detail lookup in `src/app/admin/content/content-manager.tsx` and `src/app/api/admin/tmdb/route.ts`.
- TMDB detail lookup currently returns metadata and season summaries. It does not create seasons or episodes.
- Existing Supabase tables include `content`, `seasons`, `episodes`, `streaming_servers`, `streaming_sources`, and `import_history`.
- Existing bulk link import is limited to 100 rows per request (`MAX_IMPORT_RECORDS`) and has preview/validation followed by synchronous insertion. It is not a resumable catalogue import queue.
- Existing streaming source records store approved embed URLs and are validated against configured server hosts by the player utilities.
- The repository has `npm test`, `npm run lint`, and `npm run build` scripts. No test/build execution is claimed by this planning commit.

## Architecture decisions

1. **Keep Supabase as the source of truth.** Reuse the existing catalogue and admin authorization model. Do not introduce Cloudflare D1 or duplicate content tables.
2. **Use a Cloudflare Worker only as an external API adapter where useful.** Keep provider credentials and upstream-specific behavior server-side. The Worker must enforce an explicit route allowlist, timeouts, bounded response sizes, CORS allowlists, and conservative caching.
3. **Add background processing only after provider limits and deployment configuration are known.** A resumable job table/queue should be introduced for long-running bulk imports; never keep a large import running inside one browser request.
4. **Keep providers separate.** TMDB is metadata/discovery. HindiAnime is a third-party availability/player-link source. One provider's outage must not break browsing or manual admin workflows.
5. **Do not extract, proxy, or re-host video streams.** Store only provider-supplied player/embed URLs when their use is permitted and the host is explicitly configured in AniStream. A working iframe does not prove a direct media URL exists or that redistribution is authorized.
6. **Preserve manual workflows.** Manual Add/Edit, season/episode management, and existing streaming-server controls remain available.

## Delivery phases

### Phase 1 — Auto-import metadata and episode catalogue
- Add an admin-only import screen with title/TMDB ID lookup, explicit result selection, duplicate detection, and a review-before-create step.
- Reuse the current TMDB detail route and metadata mapping; do not silently publish imported titles.
- Create/update content, seasons, and episode records idempotently. Use stable provider IDs where schema permits; otherwise add a nullable external-ID field with a unique provider-scoped index after migration review.
- Fetch episode details by season from TMDB rather than assuming season summary data contains every episode.
- Return a clear summary: created, updated, skipped, and failed, with retryable per-item errors.

### Phase 2 — Bulk import jobs
- Support CSV/TMDB ID batches with a configurable safe batch size.
- Persist job state and item state in Supabase; use bounded concurrency, checkpoint progress, idempotency keys, and retry/backoff for transient errors.
- Resume interrupted jobs and allow cancellation. Do not use unbounded parallel requests or claim a 500-item batch limit until measured against provider quotas and hosting limits.
- Keep the current 100-row streaming/download URL importer separate; catalogue import and player-link import are different workflows.

### Phase 3 — Third-party playback availability connector
- Verify the provider's permission/terms, rate limits, uptime expectations, and stable API contract before production integration.
- Implement a typed adapter for search, series/movie details, and playback lookup. Validate all returned URLs against configured HTTPS host allowlists before saving.
- Store audio labels such as Hindi and Multi-Audio as provider metadata only when actually returned by the API.
- Treat player URLs as embeds, not direct media files. Do not bypass access controls, scrape protected pages, or infer hidden stream URLs.
- Add health checks, short timeouts, bounded retries, and graceful "availability unavailable" states. Manual link entry remains the fallback.

### Phase 4 — Upcoming catalogue and airing schedule
- Use TMDB discover/air-date data for discovery and release metadata; clearly distinguish scheduled dates from confirmed local streaming availability.
- Store source IDs and timestamps, refresh on a scheduled cadence, and deduplicate by provider ID.
- Add timezone-aware schedule display (Asia/Kolkata default for the product) and clear TBA/unknown states. Do not fabricate dates or label a title as airing without a source date.

### Phase 5 — Performance, accessibility, and release verification
- Add server-side pagination, indexed lookup paths, cache only public metadata, optimize images, and avoid repeated client polling.
- Test mobile layouts, keyboard navigation, empty/error/loading states, slow provider responses, duplicate imports, interrupted jobs, and permission boundaries.
- Run unit tests, lint, type checking (if configured), and production build. Deploy only after required secrets, database migrations, and provider approval are configured.

## Required configuration and release gates

- TMDB API read token configured in the deployment environment.
- Provider permission/terms and rate limits reviewed and documented before enabling HindiAnime calls in production.
- Cloudflare account/Worker deployment access, allowed AniStream origins, and Worker secrets configured before Worker deployment.
- Supabase migrations applied in a non-production environment first; RLS and admin permissions tested.
- A production import must remain draft until an admin explicitly reviews and publishes it.

## Current status

- [x] Repository and existing feature audit.
- [x] Isolated feature branch created: `feat/auto-import-foundation`.
- [x] Architecture and phased delivery plan documented.
- [x] Admin-only TMDB auto-import UI and idempotent metadata/season/episode persistence (requires migration).
- [x] Supabase-backed bulk catalogue jobs (up to 5,000 IDs), batch processing, progress, retry of failed items, and recovery of interrupted batches. Processing is admin-page-driven; it is not a continuously running server queue.
- [ ] Provider permission/contract verification and playback connector.
- [ ] Upcoming/airing discovery and schedule UI.
- [ ] Automated verification, non-production migration validation, and deployment.
