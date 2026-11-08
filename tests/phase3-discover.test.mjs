import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = await readFile(
  new URL("../src/app/explore/page.tsx", import.meta.url),
  "utf8",
);
const header = await readFile(
  new URL("../src/components/site-header.tsx", import.meta.url),
  "utf8",
);
const frame = await readFile(
  new URL("../src/components/site-frame.tsx", import.meta.url),
  "utf8",
);

test("Discover route is backed by the published catalogue and bounded filters", () => {
  assert.match(route, /getPublishedCatalogue\(/);
  assert.match(route, /limit: 48/);
  assert.match(route, /query: firstValue\(params\.q\)\.trim\(\)\.slice\(0, 120\)/);
  assert.match(route, /function isContentKind/);
  assert.match(route, /publication/i);
  assert.match(route, /searchSampleTitles/);
  assert.match(route, /role="search"/);
  assert.match(route, /aria-label="Filter by category"/);
});

test("Discover is reachable from the shared navigation and marks its active route", () => {
  assert.match(header, /href="\/explore"/);
  assert.match(header, /activePage === "discover"/);
  assert.match(frame, /activePage\?: string/);
  assert.match(frame, /activePage=\{activePage\}/);
});

test("Discover does not change or import playback implementation", () => {
  assert.doesNotMatch(route, /StreamingPlayer|playback|embed_url|streaming_sources/i);
});
