import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { getSafeRedirectPath } from "../src/lib/auth/redirect.mjs";

const migration = await readFile(
  new URL("../supabase/migrations/20261027000100_initial_foundation.sql", import.meta.url),
  "utf8",
);

test("redirect helper accepts local paths and preserves query and hash", () => {
  assert.equal(
    getSafeRedirectPath("/anime?sort=recent#top"),
    "/anime?sort=recent#top",
  );
});

test("redirect helper rejects external and malformed destinations", () => {
  for (const destination of [
    "https://attacker.example",
    "//attacker.example/path",
    "/\\attacker.example",
    "javascript:alert(1)",
    "/path\u0000suffix",
    null,
    42,
  ]) {
    assert.equal(getSafeRedirectPath(destination), "/");
  }
});

test("content is readable only when published and has no public write policies", () => {
  const policy = migration.match(
    /create policy content_select_published[\s\S]*?;/,
  )?.[0];

  assert.ok(policy);
  assert.match(policy, /for select\s+to anon, authenticated/i);
  assert.match(policy, /publication_status = 'published'/);
  assert.doesNotMatch(migration, /create policy content_(insert|update|delete)/i);
  assert.match(
    migration,
    /grant select on table public\.content, public\.seasons, public\.episodes\s+to anon, authenticated;/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.profiles, public\.content, public\.seasons, public\.episodes\s+from public, anon, authenticated;/i,
  );
});

test("seasons and episodes select policies require published parent content", () => {
  const seasonsPolicy = migration.match(
    /create policy seasons_select_published_content[\s\S]*?;/,
  )?.[0];
  const episodesPolicy = migration.match(
    /create policy episodes_select_published_content[\s\S]*?;/,
  )?.[0];

  assert.ok(seasonsPolicy);
  assert.match(seasonsPolicy, /parent\.publication_status = 'published'/);
  assert.ok(episodesPolicy);
  assert.match(episodesPolicy, /parent_content\.publication_status = 'published'/);
  assert.doesNotMatch(migration, /create policy (seasons|episodes)_(insert|update|delete)/i);
});

test("profile read, insert, and update policies bind ownership to auth.uid()", () => {
  const readPolicy = migration.match(/create policy profiles_select_own[\s\S]*?;/)?.[0];
  const insertPolicy = migration.match(/create policy profiles_insert_own[\s\S]*?;/)?.[0];
  const updatePolicy = migration.match(/create policy profiles_update_own[\s\S]*?;/)?.[0];

  assert.ok(readPolicy);
  assert.match(readPolicy, /to authenticated/i);
  assert.match(readPolicy, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.ok(insertPolicy);
  assert.match(insertPolicy, /with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.ok(updatePolicy);
  assert.match(updatePolicy, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(updatePolicy, /with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.doesNotMatch(migration, /create policy profiles_delete_own/i);
  assert.match(migration, /grant insert \(user_id, display_name, avatar_url\)/i);
  assert.match(migration, /grant update \(display_name, avatar_url\)/i);
  assert.doesNotMatch(migration, /grant update \([^)]*updated_at/i);
});

test("database functions pin their search path and do not create admin access", () => {
  const functionBlocks = [...migration.matchAll(/create function[\s\S]*?as \$function\$/g)];

  assert.ok(functionBlocks.length >= 3);
  for (const [functionHeader] of functionBlocks) {
    assert.match(functionHeader, /set search_path = pg_catalog/i);
  }
  assert.doesNotMatch(migration, /admin|service_role/i);
});

test("private auth DAL is server-only and is not shared-cached", async () => {
  const authDataLayer = await readFile(
    new URL("../src/lib/data/auth.ts", import.meta.url),
    "utf8",
  );

  assert.match(authDataLayer, /import ["']server-only["']/);
  assert.match(authDataLayer, /auth\.getUser\(\)/);
  assert.doesNotMatch(authDataLayer, /use cache|cacheLife|unstable_cache/);
  assert.doesNotMatch(authDataLayer, /SERVICE_ROLE|SECRET_KEY/);
});

test("application and migration source do not expose privileged Supabase keys", async () => {
  async function collectSourceFiles(directoryUrl) {
    const entries = await readdir(directoryUrl, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);

      if (entry.isDirectory()) {
        files.push(...(await collectSourceFiles(entryUrl)));
      } else if (/\.(?:ts|tsx|mjs|sql)$/.test(entry.name)) {
        files.push(await readFile(entryUrl, "utf8"));
      }
    }

    return files;
  }

  const source = [
    ...(await collectSourceFiles(new URL("../src/", import.meta.url))),
    ...(await collectSourceFiles(new URL("../supabase/", import.meta.url))),
  ].join("\n");

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|service_role/i,
  );
});

test("environment example contains placeholders only", async () => {
  const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const names = example
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split("=", 1)[0]);

  assert.deepEqual(names, [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ]);
  assert.match(example, /your-project-ref/);
  assert.match(example, /your-supabase-publishable-key/);
  assert.doesNotMatch(example, /service.role|secret|eyJ[a-zA-Z0-9_-]{20}/i);
});

test("session-dependent header output is isolated behind Suspense", async () => {
  const header = await readFile(
    new URL("../src/components/site-header.tsx", import.meta.url),
    "utf8",
  );
  const accountControl = await readFile(
    new URL("../src/components/auth-account-control.tsx", import.meta.url),
    "utf8",
  );

  assert.match(header, /<Suspense[\s\S]*?<AuthAccountControl\s*\/>[\s\S]*?<\/Suspense>/);
  assert.match(accountControl, /getAuthenticatedUser\(\)/);
});

test("auth callback validates the user and uses a safe local redirect", async () => {
  const callback = await readFile(
    new URL("../src/app/auth/callback/route.ts", import.meta.url),
    "utf8",
  );
  const authDataLayer = await readFile(
    new URL("../src/lib/data/auth.ts", import.meta.url),
    "utf8",
  );

  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /ensureAuthenticatedProfile\(supabase\)/);
  assert.match(authDataLayer, /auth\.getUser\(\)/);
  assert.match(callback, /getSafeRedirectPath/);
  assert.match(callback, /new URL\(nextPath, config\.siteUrl\)/);
  assert.match(callback, /Cache-Control", "private, no-store, max-age=0"/);
});

test("sample routes and content remain present", async () => {
  const routes = [
    "../src/app/page.tsx",
    "../src/app/anime/page.tsx",
    "../src/app/drama/page.tsx",
    "../src/app/movies/page.tsx",
    "../src/app/web-series/page.tsx",
    "../src/app/search/page.tsx",
    "../src/app/title/[slug]/page.tsx",
  ];

  for (const route of routes) {
    await readFile(new URL(route, import.meta.url), "utf8");
  }

  const sampleContent = await readFile(
    new URL("../src/data/sample-content.ts", import.meta.url),
    "utf8",
  );
  assert.match(sampleContent, /export const sampleCollections/);
  assert.match(sampleContent, /export function searchSampleTitles/);
});

test("admin migration limits Super Admin bootstrap to privileged setup and guards the final admin", async () => {
  const adminMigration = await readFile(
    new URL("../supabase/migrations/20261028000100_admin_bulk_links.sql", import.meta.url),
    "utf8",
  );
  const guardMigration = await readFile(
    new URL("../supabase/migrations/20261029000100_harden_super_admin_guard.sql", import.meta.url),
    "utf8",
  );

  assert.match(adminMigration, /create unique index admin_memberships_single_super_admin_idx[\s\S]*?where role = 'super_admin'/i);
  assert.match(adminMigration, /create policy admin_memberships_insert_admin[\s\S]*?with check \([\s\S]*?role = 'admin'[\s\S]*?public\.is_super_admin\(\)/i);
  assert.doesNotMatch(adminMigration, /create policy admin_memberships_insert_super_admin/i);
  assert.match(guardMigration, /if tg_op = 'DELETE' then[\s\S]*?if not exists/i);
  assert.match(guardMigration, /elsif new\.role <> 'super_admin' then[\s\S]*?if not exists/i);
  assert.match(guardMigration, /The final Super Admin cannot be removed or demoted\./);
});


test("admin link tables revoke broad access and require scoped permissions", async () => {
  const adminMigration = await readFile(
    new URL("../supabase/migrations/20261028000100_admin_bulk_links.sql", import.meta.url),
    "utf8",
  );

  assert.match(adminMigration, /alter table public\.admin_memberships enable row level security/i);
  assert.match(adminMigration, /revoke all on table[\s\S]*?public\.import_history[\s\S]*?from public, anon, authenticated/i);
  assert.match(adminMigration, /create policy streaming_sources_admin_manage[\s\S]*?public\.has_admin_permission\('links\.import'\)/i);
  assert.match(adminMigration, /create policy download_sources_admin_manage[\s\S]*?public\.has_admin_permission\('links\.import'\)/i);
  assert.match(adminMigration, /create policy import_history_insert_actor_admin[\s\S]*?actor_id = \(select auth\.uid\(\)\)[\s\S]*?public\.has_admin_permission\('links\.import'\)/i);
  assert.match(adminMigration, /create policy streaming_sources_select_published[\s\S]*?server\.enabled[\s\S]*?parent\.publication_status = 'published'/i);
  assert.match(adminMigration, /create policy download_sources_select_published[\s\S]*?provider\.enabled[\s\S]*?parent\.publication_status = 'published'/i);
});

test("database source validators bind HTTPS URLs to the exact configured provider host", async () => {
  const adminMigration = await readFile(
    new URL("../supabase/migrations/20261028000100_admin_bulk_links.sql", import.meta.url),
    "utf8",
  );

  assert.match(adminMigration, /create function public\.validate_streaming_source\(\)[\s\S]*?url_prefix := 'https:\/\/' \|\| allowed_hostname/i);
  assert.match(adminMigration, /create function public\.validate_download_source\(\)[\s\S]*?url_prefix := 'https:\/\/' \|\| allowed_hostname/i);
  assert.match(adminMigration, /The source URL must use HTTPS and the configured server hostname\./);
  assert.match(adminMigration, /The download URL must use HTTPS and the configured provider hostname\./);
  assert.match(adminMigration, /create trigger streaming_sources_validate[\s\S]*?before insert or update/i);
  assert.match(adminMigration, /create trigger download_sources_validate[\s\S]*?before insert or update/i);
});


test("admin content search checks permission first and safely supports Unicode titles", async () => {
  const searchRoute = await readFile(
    new URL("../src/app/api/admin/content-search/route.ts", import.meta.url),
    "utf8",
  );

  assert.ok(searchRoute.indexOf('getAdminAccess("links.import")') < searchRoute.indexOf('.from("content")'));
  assert.match(searchRoute, /query\.replace\(\/\[\^\\p\{L\}\\p\{N\}\\s-\]\/gu, " "\)/);
  assert.match(searchRoute, /const rawPage = url\.searchParams\.get\("page"\) \?\? "0"/);
  assert.match(searchRoute, /Number\.isSafeInteger\(parsedPage\)/);
  assert.match(searchRoute, /Cache-Control", "private, no-store, max-age=0"/);
});
