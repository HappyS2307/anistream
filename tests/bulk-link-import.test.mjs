import assert from "node:assert/strict";
import test from "node:test";
import { parseSimplePaste, parseAdvancedCsv, validateImportRows } from "../src/lib/admin/bulk-link-import.mjs";

const context = {
  contents: [{ id: "content-1", slug: "sample-series", kind: "anime" }],
  seasons: [{ id: "season-1", content_id: "content-1", season_number: 1 }],
  episodes: [],
  streamingServers: [{ id: "server-1", name: "Abyss", hostname: "player.abyssplayer.com" }],
  downloadProviders: [],
};

test("simple paste numbers links sequentially and maps season", () => {
  const parsed = parseSimplePaste(
    "https://player.abyssplayer.com/embed/one\nhttps://player.abyssplayer.com/embed/two",
    { kind: "stream", contentSlug: "sample-series", contentKind: "anime", seasonNumber: "1", startingEpisode: "1", serverName: "Abyss" },
  );
  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(parsed.rows.map((row) => row.episodeNumber), [1, 2]);
  const validated = validateImportRows(parsed.rows, context, "stream");
  assert.deepEqual(validated.map((row) => row.status), ["ready", "ready"]);
  assert.deepEqual(validated.map((row) => row.normalized.episodeNumber), [1, 2]);
  assert.ok(validated.every((row) => row.normalized.seasonId === "season-1"));
  assert.ok(validated.every((row) => row.message.includes("created automatically")));
});

test("explicit episode numbers are preserved and invalid hosts are rejected", () => {
  const parsed = parseSimplePaste(
    "12 | https://player.abyssplayer.com/embed/valid\nhttps://evil.example/embed/invalid",
    { kind: "stream", contentSlug: "sample-series", contentKind: "anime", seasonNumber: "1", startingEpisode: "1", serverName: "Abyss" },
  );
  const validated = validateImportRows(parsed.rows, context, "stream");
  assert.equal(validated[0].normalized.episodeNumber, 12);
  assert.equal(validated[0].status, "ready");
  assert.equal(validated[1].status, "rejected");
  assert.match(validated[1].message, /approved hostname/);
});

test("duplicate URLs in one import are marked skipped", () => {
  const parsed = parseSimplePaste(
    "1 | https://player.abyssplayer.com/embed/same\n1 | https://player.abyssplayer.com/embed/same",
    { kind: "stream", contentSlug: "sample-series", contentKind: "anime", seasonNumber: "1", startingEpisode: "1", serverName: "Abyss" },
  );
  const validated = validateImportRows(parsed.rows, context, "stream");
  assert.deepEqual(validated.map((row) => row.status), ["ready", "skipped"]);
});

test("CSV parser rejects malformed or wrong-type rows", () => {
  const parsed = parseAdvancedCsv(
    "content_slug,season,episode,type,server,provider,quality,audio,url\nsample-series,1,3,stream,Abyss,,, ,https://player.abyssplayer.com/embed/three",
    "stream",
  );
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].episodeNumber, 3);
});
