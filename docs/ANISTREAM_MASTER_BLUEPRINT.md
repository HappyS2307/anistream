# AniStream Master Blueprint

**Document status:** Planning document; this file does not configure or implement the planned services and features.

**Audit snapshot:** 2026-10-27. The existing app is a Next.js 16.4.3 App Router project. Its public frontend currently contains a homepage, four category routes, GET-based search, slug-based sample title details, a shared header/frame/card system, and local illustrative artwork. The current branch was `main`, at `89c2440` (`feat: add AniStream catalogue and search`), one commit ahead of `origin/main`, with no staged or unstaged changes before this document was created. No `.env` files or environment-variable references were found in source/configuration during the audit.

**Status labels:** **Implemented** means observed in the repository as audited. **Planned** means desired behavior not currently implemented. **Decision required** means a product, security, provider, or policy choice needs approval before implementation.

## 1. Project Overview

- **Project name:** AniStream.
- **Goal:** A premium, cinematic, responsive entertainment discovery and streaming experience for Anime, Drama, Movies, and Web Series.
- **Implemented:** The UI currently has a dark cinematic homepage, category pages at `/anime`, `/drama`, `/movies`, and `/web-series`, a `/search` page, and `/title/[slug]` sample detail pages. The public catalogue contains 16 illustrative sample titles grouped in `src/data/sample-content.ts`.
- **Important content distinction:** Current titles, descriptions, and original local illustrations are clearly marked as sample/illustrative fixtures. They are not verified real catalog entries, licensed works, ratings, or availability claims. Replace them only with reviewed, accurate catalog data. Do not invent titles as production content or fabricate streaming links.
- **Artwork direction:** The current fixture art is stored locally under `public/artwork/`. The future content-authoring workflow is intended to accept supplied image URLs. Validate URL schemes and allowed hosts, configure Next.js image handling for approved hosts, and define an image fallback. No remote image configuration or URL-validation workflow exists yet. Do not use URLs for images without permission to use those assets.
- **Streaming:** Playback, external embed management, user accounts, backend services, and admin tools are not currently implemented.
- **Current stack:** Next.js App Router 16.4.3, React/React DOM 19.3.0, TypeScript (locked 5.9.3), Tailwind CSS 4 (locked 4.3.3), ESLint 9.39.5, and `eslint-config-next` 16.4.3. Current npm scripts are `dev`, `build`, `start`, and `lint`; there is no test or typecheck script.
- **Current project organization:** Application routes/components/data live under `src/`; public assets live under `public/`; Tailwind is imported in `src/app/globals.css`; the project has no database, API integration, or environment configuration. `node_modules/`, `.next/`, build output, and `.env*` are ignored by `.gitignore`.

## 2. Navigation and UI

- **Implemented:** Desktop top navigation links to the four categories and Search. At mobile widths the category links form a horizontally scrollable top rail; this is not the requested bottom navigation. A shared dark header/footer frame, focus-visible styling, skip link, and semantic landmarks are present.
- **Planned navigation:** Desktop top navigation for Home, Discover, category browsing, Saved, and Profile. Mobile bottom navigation for **Home, Discover, Saved, Profile** with accessible labels, visible active state, safe-area padding, and keyboard focus support. Category links may remain available in the Discover experience or a secondary menu.
- **Planned pages:** A dedicated modern Discover page, Saved page, and Profile page. These routes do not currently exist. Do not imply Saved/Profile persistence before the supporting user-data flow exists.
- **Implemented theme:** Dark by default with charcoal surfaces and restrained red accents. Current tokens include `--background: #101112`, `--surface: #17191a`, `--foreground: #f0eee9`, and `--accent: #d65b50`; local Geist fonts are loaded by the root layout.
- **Planned theme controls:** Accessible light/dark toggle and user-customizable accent colors. Define a finite, contrast-checked palette and persistence behavior before implementation. Neither control currently exists.
- **Implemented content card:** Responsive portrait poster, title, category, short sample description, and a detail-page link. Cards do not currently have year, rating, or quick actions.
- **Planned content card:** Poster, accurate title, year and rating only when sourced and verified, concise description, and accessible quick actions such as open details or add/remove Saved. Do not render unavailable values as real metadata.
- **Implemented responsiveness:** CSS breakpoints at 980 px, 720 px, and 380 px; responsive grids, mobile category rail, reduced-motion handling, and responsive detail layouts. This is CSS-level support; viewport screenshot coverage is not configured in the project.
- **Footer:** The current footer has the brand, a short phrase, and a back-to-top link. A configurable footer with sections and links is planned.
- **Popups:** No popup manager exists. Future announcements must use an accessible dialog pattern, predictable focus handling, Escape behavior where applicable, and mobile-friendly sizing. Avoid surprising or repeated blocking dialogs.

## 3. Homepage

- **Implemented:** One illustrative hero and four fixed category rows, sourced from local sample data. The hero, section order, titles, and artwork are not admin-controlled and must not be presented as real popularity or viewing data.
- **Planned:** Admin-selected hero/featured content; configurable homepage sections; create, delete, rename, reorder, visibility controls, draft preview, and publish workflow.
- Candidate configurable sections include Recently Added, Trending, Popular, editorial selections, and category collections. **Decision required:** Define each section's selection rule and source. Do not label items trending/popular or rank them by popularity until a real, privacy-reviewed data source and metric are approved.
- Preview and publishing must show the exact ordering, artwork, text, and visibility that will be public. Include validation for empty sections, unavailable content, and unapproved artwork.

## 4. Discover and Search

- **Implemented:** `/search` has an accessible GET search field. Its query is retained as `?q=...`; matching is case-insensitive substring matching against title, category, and the existing short description. Empty-query and no-results states are provided. Matching runs against the local in-memory sample catalogue on the server.
- **Not implemented:** A separate Discover page, genres, tags, configurable filters, suggestions, typo tolerance, recent/trending searches, sort controls, pagination, a real catalogue index, or search analytics.
- **Planned:** Admin-configurable genre/tag vocabularies and supported filters; search suggestions with keyboard navigation; typo-tolerant matching based on an approved search strategy; sorting and pagination; clear loading and empty states.
- Recent and trending searches require an approved definition, storage policy, and privacy decision. Never claim trending searches without a defined, sufficiently sampled data source. Do not log raw queries by default without a retention and privacy policy.
- Decide whether search-result URLs should be indexable. Recommended default: mark query-result pages `noindex` and canonicalize `/search` to avoid thin or sensitive query URLs being indexed.

## 5. Content Details

- **Implemented:** `/title/[slug]` looks up a stable slug in the sample model and shows local poster art, title, category, and `description` as a sample synopsis. Unknown slugs use the branded 404 UI. The current model contains no years, ratings, reviews, seasons, episodes, recommendations, or playback sources.
- **Planned:** Accurate, reviewed metadata and artwork; ratings/reviews/recommendations/watchlist controls only when their data and policies are defined. Do not fill missing values with fabricated dates, ratings, reviews, availability, seasons, or episode lists.
- Anime, Drama, and Web Series should model seasons and episodes. Movies should use a direct movie playback source, not a fabricated season/episode structure. **Decision required:** Decide whether any non-series category may also have optional special/bonus episodes.
- Planned editorial lifecycle: draft, private preview, publish, and scheduled publish/unpublish. Include author attribution, validation, audit history, and recovery from accidental publishing. Dates and time zones must be explicit.
- The current detail page has no player and intentionally says that playback and episode information are unavailable. Keep that distinction until real authorized sources exist.

## 6. User Features

- **Implemented:** Public browsing and search of sample fixtures only. There is no authentication or persistent user state.
- **Planned:** Guest browsing; guest playback only after authorized sources and playback rules exist; Google Login; profile, watchlist, favourites, watch history, Continue Watching, ratings, reviews, comments, replies, reports, moderation, and in-app notifications with read/unread state and preferences.
- Telegram Login is deferred to a later phase; do not add Telegram credentials or configuration now.
- Authenticated-user cloud synchronization is planned. Define the authoritative user identity, synchronization behavior, conflict handling, retention, and deletion semantics before implementation.
- Guest-to-account merge must require user confirmation, be idempotent, deduplicate equivalent entries, preserve the correct progress/favourite state, and explain any conflicts before applying changes.
- Public profile privacy controls must default to the least public setting approved by product policy. Account deletion must remove or anonymize personal data and handle authored content, reports, audit/legal retention, and provider backups according to an approved policy.
- Comments need reply depth/ordering limits, edit/delete rules, abuse reporting, rate limits, moderation states, and a clear separation between user-generated content and verified catalog metadata.

## 7. Streaming and Player

- **Implemented:** No playback UI, sources, embeds, or streaming URLs exist in the audited app.
- **Planned source model:** Hybrid global/server/content/episode configuration, with multiple sources per episode, server priority/default selection, and explicit source availability. Movies require direct movie sources. All links must be manually entered and reviewed by an authorized admin; never generate or invent them.
- Planned player UX: one-tap server/source switching, previous/next episode where applicable, opt-in or configured auto-next, playback progress/resume, loading timeout/retry/fallback, desktop keyboard shortcuts, and touch-friendly mobile controls. Implement only those actions that the selected embed/provider technically supports.
- Define whether progress is available for third-party iframe sources. Cross-origin browser rules generally prevent the parent site from reading an iframe's playback time or reliably detecting playback state. Accurate resume/auto-next may require a documented provider messaging API or a first-party player; do not pretend these capabilities work for arbitrary embeds.
- Manual embed URLs require scheme/domain validation, safe iframe attributes, restrictive Content Security Policy `frame-src`, and careful treatment of redirects and query parameters. Provider allowlists should be explicit and maintainable.
- Document provider terms, copyright/authorization, privacy, cookie behavior, geo-restrictions, ads, mobile compatibility, and third-party availability. AniStream cannot guarantee that an external server remains online or honors a link.

## 8. Playback Protection Engine

- **Implemented:** No protection engine or playback-source configuration exists.
- **Planned resolution precedence, per setting:** **Episode > Content > Server > Global**. A higher-scope value overrides lower scopes; `Inherit` falls through to the next scope. Define deterministic defaults when every scope inherits. Avoid silently treating a missing setting as enabled.
- **Planned states and presets:** `Inherit`, `Enabled`, and `Disabled` for individually configurable settings; named Strict, Balanced, Relaxed, and Off presets as reviewed starting profiles; an individual-setting mode for explicit manual overrides. Presets must be versioned and previewed, not opaque magic behavior.
- **Planned controls:** Centralized policy configuration; domain allowlists where technically appropriate; server health checks and playback-error statistics; bulk server assignment; preview/confirmation for risky changes; immediate application only for changes assessed as safe; and append-only admin audit logs.
- **Security boundary:** Separate real server-side controls (authorization, URL validation, source access policy, secrets, rate limiting, CSP, and backend policy) from superficial browser restrictions. Disabling right-click, keyboard shortcuts, context menus, or DevTools does not secure an iframe or video URL. Browser-delivered URLs can be inspected and captured; no design can guarantee prevention of screen recording.
- Third-party iframe behavior is controlled partly by the provider. AniStream cannot enforce protections inside a cross-origin frame unless the provider exposes a supported integration. Do not claim DRM or secure URL hiding without an actual, reviewed technical mechanism.
- **Decision required:** Define the threat model, individual protection settings, what Off means, preset values, allowlist ownership, health-check behavior, risk categories, approval thresholds, and which actions are super-admin-only.

## 9. Admin Panel

- **Implemented:** No admin route or administration UI exists.
- **Planned:** Dashboard and quick actions; content management; seasons/episodes; bulk import; metadata integration; server management; playback protection; homepage builder; popup/footer managers; user/admin management; notifications; community moderation; SEO and website settings; maintenance mode; error reporting and analytics.
- Admin workflows should be advanced in capability but simple to operate: clear labels, contextual help, searchable/filterable tables, pagination, previews, validation, unsaved-change indicators, deliberate confirmation dialogs, and accessible status feedback.
- Bulk import must validate files/records, show a dry-run preview, report row-level errors, reject unsupported/unapproved URLs, and avoid partial publication. Metadata integrations require an approved provider, licensing/terms review, mapping rules, and a manual correction path.
- Dashboard analytics must distinguish observed measurements from estimates. No watch/popularity metrics currently exist.

## 10. Admin Roles and Security

- **Requirement:** One Super Admin has complete control. Additional admins may be created/managed by the Super Admin. Additional-admin permissions are configurable, but sensitive functions remain Super-Admin-only. Never implement these roles until the authorization model is approved.
- **Proposed permission matrix (starting point, not yet approved):**

| Capability | Super Admin | Additional Admin |
| --- | --- | --- |
| Manage published/draft catalog, homepage, popups, and footer | All actions | Only explicitly granted capabilities |
| Manage seasons, episodes, artwork, and bulk imports | All actions | Only explicitly granted capabilities |
| Assign servers and edit sources | All actions | Deny by default; grant only after risk review |
| Edit playback-protection policies | All actions | Deny by default; any delegated scope requires explicit approval |
| Moderate reports/comments and manage notifications | All actions | Only explicitly granted capabilities |
| View operational dashboards and scoped audit records | Full scope | Read-only and scope-limited if granted |
| Create/manage admins, change role definitions, grant permissions, transfer/recover Super Admin | Yes | No |
| Manage auth/database secrets, security policy, RLS, or destructive system settings | Yes | No; remain Super-Admin-only unless security review approves an exact delegated action |
| Delete own admin account | Subject to a recovery-safe process; never leave zero Super Admins | Only by approved lifecycle policy; cannot delete/disable the sole Super Admin |

- Implement authorization on the server for every protected route, mutation, and data query. Hiding buttons in the browser is not authorization. Database permissions and service-role credentials must never be shipped to client code.
- **Decisions required:** How the sole Super Admin is initially provisioned/recovered; whether the Super Admin may ever be transferred; exact sensitive-function list; permission names/scopes; whether permissions can be time-limited; two-person approval for high-impact operations; and audit-log retention/access.
- Require verified admin identity, account recovery, session revocation, rate limiting, CSRF protections for applicable actions, abuse prevention, least privilege, secret rotation, and auditable changes. Protect the last Super Admin from accidental removal.

## 11. Database and Backend

- **Preference, not implementation:** Supabase Free with PostgreSQL is the initial preference; the preferred shape is managed database/authentication plus carefully scoped custom backend logic. The target is approximately 1,000-10,000 registered users with an initial strictly free budget. Hosting is not finalized. No Supabase package, project, schema, auth provider, or backend integration currently exists.
- Free-tier quotas, pausing/inactivity rules, backup/restore guarantees, commercial-use terms, egress, storage, connection limits, and current provider capabilities change. Recheck current official terms and load-test assumptions before choosing. Do not promise that a free plan supports a user count, uptime target, or recovery point until verified.
- **Proposed normalized relational entities (illustrative; do not create schema in this phase):**

| Entity | Purpose and key relationship |
| --- | --- |
| `content` | Stable slug, category/type, title, synopsis, artwork reference, publication state, and reviewed metadata; unique slug; one row per title. |
| `seasons` | Belongs to series content; unique season number/order per content. |
| `episodes` | Belongs to a season; unique episode number/order per season. Movies should not require fake seasons. |
| `streaming_servers` | Admin-managed server identity, approved host/domain, priority/default metadata, and operational status; no secret values exposed to clients. |
| `stream_sources` | Manually reviewed external source per movie or episode, associated with a server and sort priority; use constraints so a source targets exactly one supported content/episode scope. |
| `protection_policies` | Global singleton plus server/content/episode scoped overrides; one policy per scope/target; values support inherit/enabled/disabled per setting. |
| `profiles` | User-facing profile/privacy fields keyed to managed auth identity; never duplicate credentials. |
| `watchlists` / `watchlist_items` | User-owned named lists/items or a single default list; unique user/list/content tuple; define favourites as a list kind or an explicit relation after product decision. |
| `watch_progress` | User/content and optional episode position/updated time; unique key depends on movie versus episode; validate nonnegative/bounded progress. |
| `reviews` | User/content rating and optional written review; one active rating per user/title unless history/versioning is approved. |
| `comments` | User/content or episode discussion; self-reference for replies; moderation state and timestamps. |
| `reports` | Reporter, target, reason, state, moderation outcome, and audit timestamps; access restricted. |
| `notifications` / `notification_preferences` | User-targeted messages, read state, category preferences, and delivery policy. |
| `admin_memberships`, `admin_roles`, `admin_permissions`, role/permission grants | Server-enforced admin assignments and scopes; one immutable Super Admin identity at a time per approved policy. |
| `audit_logs` | Append-only actor/action/target/time and reviewed change summary; avoid logging secrets or unnecessary personal data. |

- Relationships: content has many seasons; seasons have many episodes; sources reference either a movie/content record or a series episode and a server; scoped policies reference one scope; users own profiles, lists, progress, reviews, comments, notifications, and admin memberships. Keep referential integrity explicit. Use `RESTRICT` where deletion would destroy published/audit history and controlled soft-delete/retention workflows where needed.
- Indexes/constraints: unique normalized slug; category/status/publication indexes for public browse; lowercased/title text index for search; composite unique ordering for seasons/episodes; foreign-key indexes; unique user/content list entries; user/episode progress keys; user/unread notification lookup; moderation queue state/time indexes; check constraints for enums, ranges, and source scope. Consider PostgreSQL full-text or trigram indexes only after the search language, extension availability, data volume, and free-tier cost are verified.
- Row Level Security requirements: public reads only for published public catalog fields; draft/preview data admin-only; user-owned profile/list/progress/notification access restricted to that user; review/comment write and moderation rules explicit; reports private; admin permissions checked server-side and enforced in database policies where appropriate. Test policies using anonymous, ordinary-user, additional-admin, and Super Admin identities. Never expose a database service-role key to browser code.
- Store metadata and artwork references, not video files, in PostgreSQL. Large video media belongs with an authorized streaming/storage provider. Keep external source URLs protected according to approved policy, while acknowledging URLs ultimately delivered to browsers are inspectable.

## 12. SEO and Google Search

- **Implemented:** Root-level title/description metadata and static route rendering for known catalogue content. No sitemap, `robots.txt`, canonical policy, structured data, or Search Console setup is present.
- **Planned:** Unique metadata for public home/category/title pages; canonical URLs; XML sitemap from published, indexable content; `robots.txt`; breadcrumbs/internal links; accurate Open Graph metadata; structured data only when fields are verified and the schema is appropriate.
- Admin, user-private pages, drafts/previews, and other non-public pages must be protected by server authorization and excluded from indexing; `robots.txt` is not access control. Decide canonical and `noindex` behavior for search queries, profiles, review pages, and unpublished preview links.
- Launch checklist: verify domain ownership in Google Search Console; submit sitemap; inspect representative URLs; validate canonical, robots, and structured data; check mobile usability/performance; monitor crawl/indexing errors and security issues; review stale/removed content handling. Search indexing and ranking cannot be guaranteed.

## 13. Popup and Footer Management

- **Implemented:** Static footer only; no popup manager.
- **Planned popup model:** Configurable announcement text and supplied image URL, optional action button, page targeting, start/end schedule with explicit time zone, audience targeting only when identity/consent data supports it, frequency limits, dismissal persistence, and preview before publish.
- Popups must be semantic accessible dialogs: labelled, focus-managed, keyboard operable, dismissible, usable on small screens, and non-blocking where possible. Respect reduced motion and do not repeatedly interrupt users. Validate image URLs and action destinations; no open redirects.
- **Planned footer model:** Admin-configurable sections and links with ordering, visibility, URL validation, preview, publication history, and safe defaults. External links should be clearly identified and opened safely.

## 14. Performance and Reliability

- **Implemented:** Next.js static/partial prerendering, local optimized artwork paths, responsive images via `next/image`, CSS skeletons, and reduced-motion handling. No uptime/error/slow-query monitoring is configured.
- **Planned:** Paginate large catalogues; lazy-load below-fold media; use responsive image sizes and approved image hosts; cache public published content; define cache invalidation for edits/publishing; optimize database queries and indexes; monitor slow queries and application errors; retain useful structured application logs without secrets/needless personal data.
- Add uptime monitoring, alert ownership, maintenance mode with carefully authorized admin bypass, and recovery/rollback runbooks. Test degraded external image/embed/database behavior.
- Scheduled read-only database activity to reduce inactivity-related pausing may be evaluated only if permitted by provider terms and cost limits. It does not guarantee a free project remains active, available, or unpaused.
- Backups and recovery objectives must reflect actual provider guarantees. Define export cadence, retention, encryption, restore drills, and who can access backups; do not state that a free tier guarantees backups or uninterrupted service.

## 15. Deployment

- **Current:** Git branch workflow exists (`main` tracks `origin/main`); the audited checkpoint was one local commit ahead. No CI workflow or hosting provider was found in the repository audit. Current project scripts are lint/build/dev/start; there is no automated test script.
- **Planned:** GitHub-based review, automatic preview deployments, required lint/build checks, explicit approval before production deployment, environment-specific configuration, and least-privilege secret management. Never commit secrets; `.env*` is gitignored, but verify staged files before every commit.
- Hosting provider remains undecided. Compare current free-tier quotas, commercial-use terms, Next.js App Router/Cache Components support, image optimization, server functions, region/data residency, auth/database integration, build minutes, bandwidth, and migration/rollback options. Recheck official terms immediately before launch.
- Deployment checklist: validate env vars at startup without logging values; use separate preview/production credentials and data; test auth redirects/callbacks; run migration dry runs/backups; verify lint/build and security policies; require production approval; preserve the last known-good deployment and database migration rollback plan. Database rollback may require a forward fix rather than destructive schema reversal.

## 16. Phased Implementation Plan

The phases below are small and should have their own review and acceptance gates. Existing frontend work is recorded as already present; do not recreate it. The sequence puts identity/data foundations before features that depend on persistent user state. Phase ordering is a proposal, not authorization to add a provider or deployment.

### Phase 0 - Repository Audit and Architecture (**Complete**)

- **Scope:** Record framework, routes, data shape, styling, scripts, environment references, and Git state.
- **Dependencies:** Existing repository.
- **Acceptance:** Architecture and implemented/planned boundaries documented; no secrets or unreviewed external services; scope approved.
- **Security:** Identify data trust boundaries and confirm no credentials are checked in.
- **Tests:** Read-only inventory, `npm run lint`, `npm run build`, Git/status review where appropriate.
- **Exclusions:** No source changes, schema, auth, hosting, or deployment.

### Phase 1 - Database and Authentication Foundation (**Planned; provider decision required**)

- **Scope:** Choose provider; create reviewed migrations for core content/user/admin structures; implement server-only data access, Google auth plan, session lifecycle, and initial RLS. Keep Telegram deferred.
- **Dependencies:** Approved data model, privacy/retention decisions, provider terms/free-tier review, domain and OAuth ownership.
- **Acceptance:** Anonymous/public access sees only published catalog data; authenticated identities are verified; private user data isolation and account recovery work; schema migrations are repeatable.
- **Security:** RLS tests, secret handling, least privilege, verified callback URLs, CSRF/session/rate-limit review, no service key in client bundle.
- **Tests:** Migration up/down or forward-recovery tests; authorization matrix tests; anonymous/user/admin RLS tests; auth callback/session/logout/recovery tests.
- **Exclusions:** No playback sources, community, external metadata scraping, admin content UI, or production secrets in Git.

### Phase 2 - Design System and Shared Layout (**Partly implemented**)

- **Scope:** Preserve existing tokens, local fonts, responsive header/footer, poster card, dark styling, reduced motion, and skeletons. Add planned mobile bottom nav, theme toggle, and accent settings only after design decisions.
- **Dependencies:** Existing Next/Tailwind 4 project; approved mobile information architecture and accessibility targets.
- **Acceptance:** Shared components work across pages; responsive layouts at supported breakpoints; focus/contrast/reduced motion checks pass; no existing routes regress.
- **Security:** Validate any persisted preferences as untrusted input; do not store credentials/theme data in unsafe script contexts.
- **Tests:** Lint/build; component/accessibility checks; keyboard navigation; viewport and color-contrast tests when browser tooling is selected.
- **Exclusions:** No authentication, admin, playback, or backend integration in the layout itself.

### Phase 3 - Home, Discover, Saved, Profile, and Content Details (**Partly implemented; current next frontend gap**)

- **Scope:** Retain existing homepage/category/search/detail routes; add a distinct Discover, Saved, and Profile experience; connect approved catalog metadata, search/filter/sort/pagination, watchlist controls, and details to the backend.
- **Dependencies:** Phase 1 data/auth contracts; Phase 2 navigation/card contracts; approved content/artwork sources and metadata rules.
- **Acceptance:** Categories filter actual content; search URL and results are deterministic; detail metadata is sourced; empty/loading/error states exist; anonymous/private state is correctly separated; mobile bottom navigation works.
- **Security:** Server-side access to private profile/watchlist/progress; do not leak drafts or personal data in prerendered output/cache; validate artwork URLs.
- **Tests:** Category/search/detail route tests; authorization and cache-isolation tests; invalid slugs; responsive/accessibility tests; image loading/fallback tests.
- **Exclusions:** No actual streaming player, fabricated metadata, unapproved ratings, or unsupported episode data.

### Phase 4 - Admin Content Management

- **Scope:** Super Admin-controlled content editing, seasons/episodes, media metadata, image URL validation, bulk import dry-run, draft/preview/publish/scheduling, and content audit history.
- **Dependencies:** Phase 1 schema/roles; Phase 3 display model; approved metadata providers and content rights.
- **Acceptance:** Drafts stay private; preview matches publication; validation and import errors are actionable; publish/unpublish is auditable and reversible through a defined recovery path.
- **Security:** Server-side authorization on every action; super-admin-only sensitive actions; CSRF/rate-limit controls; escaped user/admin text; admin audit log.
- **Tests:** Permission matrix, draft isolation, scheduling/time-zone tests, import validation, image-host allowlist, rollback/restore tests.
- **Exclusions:** No stream source editing unless Phase 5 has an approved server model; no automatic metadata claims without a verified provider.

### Phase 5 - Streaming Server Management

- **Scope:** Admin-managed server records, approved domains, priorities/default server, source assignment, bulk operations, operational status, and safe preview/confirmation.
- **Dependencies:** Approved stream source model, provider/legal review, admin roles, audit logging, domain policy.
- **Acceptance:** Multiple sources map to the right movie/episode; priority/default behavior is deterministic; invalid/unapproved hosts are rejected; changes are attributable and reversible.
- **Security:** Strict authorization, HTTPS/host validation, SSRF protections for any server-side health check, rate limits, no privileged probes of admin-supplied arbitrary URLs.
- **Tests:** Scope/priority resolution, URL validation/redirect tests, role tests, audit tests, health-check limits/timeouts.
- **Exclusions:** No fake links, server bypass/proxy claims, playback UI, or unsafe arbitrary URL fetching.

### Phase 6 - Playback and Protection

- **Scope:** Manual-source player integration, episode navigation, source switching, supported resume/progress, failure fallback, and layered policy resolution (Episode > Content > Server > Global).
- **Dependencies:** Phase 5 servers/sources; provider capability/terms; approved threat model and protection presets; user progress model.
- **Acceptance:** Only verified configured sources render; unsupported iframe features are omitted; policy precedence is unit-tested; provider limits and user-facing errors are clear.
- **Security:** Enforce real backend access rules, CSP/allowlists and URL validation; protect admin mutations; never claim DevTools/right-click restrictions secure a media URL; audit risky changes.
- **Tests:** Policy inheritance/override matrix; source/iframe sandbox checks; timeout/retry/error tests; provider messaging tests; progress privacy and cache-isolation tests.
- **Exclusions:** No DRM claims, fabricated links, guarantee against capture, or controls unsupported by the embed provider.

### Phase 7 - Community and Notifications

- **Scope:** Ratings/reviews/comments/replies/reports/moderation and in-app notifications/preferences.
- **Dependencies:** Auth/profile/privacy model, moderation policy, rate limiting, retention and notification consent decisions.
- **Acceptance:** Users can control permitted data; reports reach a moderation queue; notification read/unread/preferences work; abusive content can be hidden with audit trail.
- **Security:** RLS and server authorization; abuse/spam limits; XSS-safe rendering; private reports; retention/deletion policy; moderator action audit.
- **Tests:** Ownership, visibility, report lifecycle, moderation, notification preferences, rate-limit and account-deletion tests.
- **Exclusions:** No public profile by default without consent; no unmoderated real-time chat; no external push/email provider until approved.

### Phase 8 - SEO, Monitoring, and Deployment Hardening

- **Scope:** Public metadata/canonicals/sitemap/robots/structured data, Search Console checklist, application/error/slow-query monitoring, uptime, maintenance mode, production CI/deployment approval, backups, rollback.
- **Dependencies:** Production domain and hosting decision; stable publish workflows; privacy/analytics approval; provider operational terms.
- **Acceptance:** Public pages are crawlable as intended; private/draft pages are not exposed/indexed; checks gate previews/releases; restore/rollback procedure is exercised; alerts have an owner.
- **Security:** Secret manager and environment separation; least-privilege CI; no credentials in logs; security headers; private-route authorization independent of crawler directives.
- **Tests:** Lint/build/route smoke tests; sitemap/robots/canonical checks; deployment preview and rollback drill; backup restore drill; monitoring alert test.
- **Exclusions:** No guarantee of search ranking, free-tier uptime, uninterrupted database service, or backups beyond provider commitments.

## 17. Open Questions and Risks

1. **Catalog truth and rights:** Who supplies approved titles, synopses, artwork URLs, release data, and rights/availability confirmation? What is the review cadence and takedown process?
2. **Content taxonomy:** Which exact types require seasons/episodes, and how should specials, trailers, extras, or limited series be represented?
3. **Ratings and reviews:** Which rating scale/source, review eligibility, spoiler handling, moderation policy, and display threshold should be used?
4. **Authentication/privacy:** What profile fields are required? Which fields are public by default? What are the Google OAuth owner, redirect domains, retention rules, and account deletion requirements? Telegram remains deferred.
5. **Guest merge:** Which guest fields merge, how are duplicates resolved, and can watch progress from different devices conflict?
6. **Database/provider:** Is Supabase Free acceptable after current quotas/terms are reviewed? What are the data residency, backup, restore, inactivity, egress, and RPO/RTO requirements for 1,000-10,000 users?
7. **Hosting:** Which provider supports this Next.js version/features and acceptable commercial terms within a strictly free initial budget? What happens when quotas are exceeded?
8. **Streaming legality and capability:** Which external providers are authorized? What domains and player messaging APIs are available? Which features can be relied on cross-origin? How will broken/removed links be handled?
9. **Protection threat model:** Which harms are being mitigated, which settings are genuine server-side controls, what does Off mean, and which actions require a second approver or Super Admin?
10. **Admin provisioning:** How is the single Super Admin created, recovered, rotated, and protected against lockout? Which exact additional-admin permissions may be delegated?
11. **UGC policy:** Who moderates, what content is prohibited, what are escalation/appeal procedures, and how long are comments/reports/audit records retained?
12. **Search and analytics:** Which language/tokenization, typo tolerance, recent/trending definition, query retention, analytics consent, and pagination defaults are acceptable?
13. **Homepage scheduling/popups:** Which time zone controls schedules? What are audience/frequency defaults and publication approval rules?
14. **Privacy/SEO:** Which pages/profiles/reviews are public and indexable? What analytics/consent controls and data removal guarantees apply?
15. **Reliability and free-tier risk:** Free tiers can change, pause projects, throttle usage, and provide limited backups/support. A keep-alive task is not a guarantee of uptime and must comply with provider terms.
16. **Iframe limitations:** Third-party embeds can expose URLs, set cookies, show ads, fail independently, block framing, or prevent reliable progress tracking. Browser-level blocking cannot secure them.
17. **Search and popularity claims:** The current local sample list is not usage telemetry. Do not ship Trending/Popular labels or ranking until a source, consent/retention policy, and metric are approved.
18. **Image URLs:** Which image hosts are permitted, who confirms rights, how are redirects/content types/large files checked, and what fallback/availability expectations apply?

---

## Current Implementation Inventory

This inventory records what was present at the audit snapshot; it is not a promise that every desired capability already exists.

| Area | Present in repository | Not present yet |
| --- | --- | --- |
| Routes | `/`, `/anime`, `/drama`, `/movies`, `/web-series`, `/search`, `/title/[slug]`, branded not-found | Dedicated `/discover`, `/saved`, `/profile`, admin/backend routes |
| Data | 16 sample titles grouped into four typed collections; each has slug, title, category, short description, local artwork path | Years, ratings, genres/tags, seasons, episodes, reviews, user state, stream sources, publication/admin metadata |
| Search | GET `q` parameter; case-insensitive substring match over title/category/description; empty and no-results states | Suggestions, typo tolerance, recent/trending searches, sort, pagination, production index |
| UI | Dark theme tokens, Geist, responsive poster cards, shared top header/footer, skeleton, focus styles, reduced-motion support | Mobile bottom nav, theme toggle, accent picker, configured popups/footer, advanced content actions |
| Artwork | One local hero and 16 local poster WebPs; scaffold SVGs | Admin image-URL workflow, URL allowlist, remote image configuration |
| Backend | None; no environment variable references or `.env` files found | Supabase project/schema, auth, APIs, RLS, admin authorization, analytics, notifications |
| Quality/deploy | npm scripts: `dev`, `build`, `start`, `lint`; production build and lint were available | Test script, typecheck script, CI workflow, hosting selection, production approval/rollback automation |
| Git | At audit: `main` at `89c2440`, ahead of `origin/main` by one commit; no staged or unstaged changes | No additional changes should be inferred from this snapshot after the blueprint is added |

## Recommended Next Step

Before implementing Phase 3 user-facing Saved/Profile behavior, decide and approve the data/auth provider, content and privacy model, source-of-truth metadata, admin provisioning, and RLS/security requirements. Then implement the smallest testable database/auth foundation and server-side authorization boundary. Keep the existing Phase 1/2 frontend intact and integrate it incrementally; do not add playback, Supabase credentials, or admin roles until the relevant decisions are approved.
