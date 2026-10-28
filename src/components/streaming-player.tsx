"use client";

import { useState } from "react";
import {
  getAdjacentEpisodeIndex,
  getInitialServerId,
  resolvePlayerSource,
} from "@/lib/player/player-utils.mjs";
import type { PlayerEpisode } from "@/lib/player/player-utils.mjs";

type FrameState = "loading" | "ready" | "error";

export function StreamingPlayer({
  title,
  episodes,
}: {
  title: string;
  episodes: PlayerEpisode[];
}) {
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [serverId, setServerId] = useState(() =>
    getInitialServerId(episodes[0]?.sources),
  );
  const [frameState, setFrameState] = useState<FrameState>("loading");
  const [autoplayNext, setAutoplayNext] = useState(false);

  const episode = episodes[episodeIndex];
  const sources = episode?.sources ?? [];
  const {
    source: activeSource,
    embedUrl,
    protectionEnabled,
    status: sourceStatus,
  } = resolvePlayerSource(sources, serverId);
  const previousIndex = getAdjacentEpisodeIndex(episodeIndex, -1, episodes.length);
  const nextIndex = getAdjacentEpisodeIndex(episodeIndex, 1, episodes.length);

  function selectEpisode(index: number) {
    setEpisodeIndex(index);
    setServerId(getInitialServerId(episodes[index]?.sources));
    setFrameState("loading");
  }

  function selectServer(value: string) {
    setServerId(value || null);
    setFrameState("loading");
  }

  return (
    <section className="streaming-player" aria-labelledby="player-heading">
      <div className="streaming-player__heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            {activeSource?.testSource ? "TEST SOURCE" : "PLAYER PREVIEW"}
          </p>
          <h2 id="player-heading">Watch {title}</h2>
        </div>
        <span className="streaming-player__demo-label">Local demo data</span>
      </div>

      <div className="streaming-player__stage" aria-live="polite">
        {embedUrl && activeSource ? (
          <>
            {frameState === "loading" ? (
              <div className="streaming-player__overlay" role="status">
                <span className="streaming-player__spinner" aria-hidden="true" />
                Loading selected source…
              </div>
            ) : null}
            {frameState === "error" ? (
              <div className="streaming-player__message" role="alert">
                <strong>This embed could not be loaded.</strong>
                <span>Select another server or try again later.</span>
              </div>
            ) : null}
            <iframe
              key={`${episode?.id}-${activeSource.id}`}
              className="streaming-player__frame"
              src={embedUrl}
              title={`${title} — ${episode?.label ?? "player"} — ${activeSource.serverName}`}
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => setFrameState("ready")}
              onError={() => setFrameState("error")}
            />
          </>
        ) : (
          <div className="streaming-player__message">
            <span className="streaming-player__play-mark" aria-hidden="true">
              ▶
            </span>
            <strong>
              {sourceStatus === "invalid"
                ? "This URL is not allowed. Only HTTPS URLs on approved embed hosts can load."
                : sourceStatus === "demo"
                  ? "Demo server selected — no playable video is configured."
                  : sourceStatus === "missing" && episodes.length > 0
                    ? "No source is configured for this item."
                    : "No demo episodes or playback sources are configured."}
            </strong>
            <span>
              {sourceStatus === "invalid"
                ? "Check the configured source URL and approved hostname."
                : "The player does not invent or generate playback URLs."}
            </span>
          </div>
        )}
      </div>

      <div className="streaming-player__controls">
        {episodes.length > 0 ? (
          <>
            <div className="streaming-player__episode">
              <p className="streaming-player__label">Episode</p>
              <div className="streaming-player__episode-nav">
                <button
                  className="streaming-player__nav-button"
                  type="button"
                  disabled={previousIndex === null}
                  onClick={() => {
                    if (previousIndex !== null) selectEpisode(previousIndex);
                  }}
                  aria-label="Previous episode"
                >
                  ←
                </button>
                <span className="streaming-player__episode-name">
                  {episode?.label}
                </span>
                <button
                  className="streaming-player__nav-button"
                  type="button"
                  disabled={nextIndex === null}
                  onClick={() => {
                    if (nextIndex !== null) selectEpisode(nextIndex);
                  }}
                  aria-label="Next episode"
                >
                  →
                </button>
              </div>
            </div>

            <div className="streaming-player__server">
              <label className="streaming-player__label" htmlFor="player-server">
                Server
              </label>
              <select
                id="player-server"
                value={serverId ?? ""}
                onChange={(event) => selectServer(event.currentTarget.value)}
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.serverName}
                  </option>
                ))}
              </select>
              {activeSource ? (
                <div className="streaming-player__server-status" role="status">
                  <span className="streaming-player__active-server">
                    Active server: {activeSource.serverName}
                  </span>
                  <span
                    className={`streaming-player__protection ${protectionEnabled ? "is-enabled" : "is-disabled"}`}
                  >
                    Protection {protectionEnabled ? "enabled" : "disabled"}
                  </span>
                  {activeSource.testSource ? (
                    <span className="streaming-player__test-source">
                      User-supplied test source; playback not yet verified
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <label className="streaming-player__autoplay">
              <input
                type="checkbox"
                checked={autoplayNext}
                onChange={(event) => setAutoplayNext(event.currentTarget.checked)}
              />
              <span>Autoplay next preference</span>
            </label>
          </>
        ) : null}
      </div>

      <p className="streaming-player__note">
        {autoplayNext
          ? "Preference enabled for this preview. Automatic playback depends on the external provider and is not triggered by this player."
            : "Protection reports this source’s setting plus baseline URL validation. It cannot prevent URL inspection or sharing. Automatic episode transitions depend on provider support."}
      </p>
    </section>
  );
}