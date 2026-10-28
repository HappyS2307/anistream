import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdjacentEpisodeIndex,
  getInitialServerId,
  resolvePlayerSource,
  SUPPORTED_EMBED_HOSTS,
  validateEmbedUrl,
} from "../src/lib/player/player-utils.mjs";

const allowedHosts = ["player.example.test"];

test("only the exact approved Abyss Player hostname is supported by default", () => {
  assert.deepEqual(SUPPORTED_EMBED_HOSTS, ["player.abyssplayer.com"]);
  assert.equal(
    validateEmbedUrl("https://player.abyssplayer.com/N7HlJkX9Z"),
    "https://player.abyssplayer.com/N7HlJkX9Z",
  );
  assert.equal(
    validateEmbedUrl("https://sub.player.abyssplayer.com/N7HlJkX9Z"),
    null,
  );
});

test("embed URL validation accepts HTTPS URLs on an explicitly allowed host", () => {
  assert.equal(
    validateEmbedUrl(
      "https://player.example.test/embed/sample?id=42",
      allowedHosts,
    ),
    "https://player.example.test/embed/sample?id=42",
  );
});

test("embed URL validation rejects insecure, unlisted, credentialed, and malformed URLs", () => {
  for (const value of [
    "http://player.example.test/embed/sample",
    "//player.example.test/embed/sample",
    "https://unlisted.example.test/embed/sample",
    "https://user:pass@player.example.test/embed/sample",
    "https://player.example.test:8443/embed/sample",
    "javascript:alert(1)",
    "<iframe src='https://player.example.test'></iframe>",
    null,
  ]) {
    assert.equal(validateEmbedUrl(value, allowedHosts), null);
  }

  assert.equal(validateEmbedUrl("https://player.example.test/embed/sample"), null);
});

test("initial server selection uses the first configured source", () => {
  assert.equal(
    getInitialServerId([
      { id: "source-a", serverName: "Demo A", embedUrl: null },
      { id: "source-b", serverName: "Demo B", embedUrl: null },
    ]),
    "source-a",
  );
  assert.equal(getInitialServerId([]), null);
  assert.equal(getInitialServerId(undefined), null);
});

test("protected and unprotected servers resolve independently", () => {
  const sources = [
    {
      id: "protected",
      serverName: "Protected test source",
      embedUrl: "https://player.example.test/embed/protected",
      protectionEnabled: true,
    },
    {
      id: "unprotected",
      serverName: "Unprotected test source",
      embedUrl: "https://player.example.test/embed/unprotected",
      protectionEnabled: false,
    },
  ];

  const protectedResult = resolvePlayerSource(sources, "protected", allowedHosts);
  const unprotectedResult = resolvePlayerSource(sources, "unprotected", allowedHosts);

  assert.equal(protectedResult.source?.id, "protected");
  assert.equal(protectedResult.protectionEnabled, true);
  assert.equal(protectedResult.status, "ready");
  assert.equal(unprotectedResult.source?.id, "unprotected");
  assert.equal(unprotectedResult.protectionEnabled, false);
  assert.equal(unprotectedResult.status, "ready");

  const invalidUnprotected = resolvePlayerSource(
    [{ ...sources[1], embedUrl: "https://unlisted.example.test/embed/video" }],
    "unprotected",
    allowedHosts,
  );
  assert.equal(invalidUnprotected.protectionEnabled, false);
  assert.equal(invalidUnprotected.embedUrl, null);
  assert.equal(invalidUnprotected.status, "invalid");
});

test("episode navigation returns no index beyond either boundary", () => {
  assert.equal(getAdjacentEpisodeIndex(1, -1, 3), 0);
  assert.equal(getAdjacentEpisodeIndex(1, 1, 3), 2);
  assert.equal(getAdjacentEpisodeIndex(0, -1, 3), null);
  assert.equal(getAdjacentEpisodeIndex(2, 1, 3), null);
  assert.equal(getAdjacentEpisodeIndex(0, 1, 0), null);
  assert.equal(getAdjacentEpisodeIndex(0, 2, 3), null);
});