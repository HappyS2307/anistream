export const SUPPORTED_EMBED_HOSTS = Object.freeze([
  "player.abyssplayer.com",
]);

export function validateEmbedUrl(value, allowedHosts = SUPPORTED_EMBED_HOSTS) {
  if (typeof value !== "string" || !Array.isArray(allowedHosts)) {
    return null;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    const isAllowedHost = allowedHosts.some(
      (allowedHost) =>
        typeof allowedHost === "string" &&
        allowedHost.toLowerCase().replace(/\.$/, "") === hostname,
    );

    if (
      url.protocol !== "https:" ||
      !isAllowedHost ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function getInitialServerId(sources) {
  return Array.isArray(sources) && sources.length > 0
    ? (sources[0]?.id ?? null)
    : null;
}

export function resolvePlayerSource(
  sources,
  selectedServerId,
  allowedHosts = SUPPORTED_EMBED_HOSTS,
) {
  const source = Array.isArray(sources)
    ? (sources.find((entry) => entry.id === selectedServerId) ?? null)
    : null;

  if (!source) {
    return {
      source: null,
      embedUrl: null,
      protectionEnabled: false,
      status: "missing",
    };
  }

  const embedUrl = validateEmbedUrl(source.embedUrl, allowedHosts);

  return {
    source,
    embedUrl,
    protectionEnabled: source.protectionEnabled === true,
    status: embedUrl
      ? "ready"
      : source.embedUrl
        ? "invalid"
        : source.demoOnly
          ? "demo"
          : "missing",
  };
}

export function getAdjacentEpisodeIndex(currentIndex, direction, episodeCount) {
  if (
    !Number.isInteger(currentIndex) ||
    !Number.isInteger(episodeCount) ||
    (direction !== -1 && direction !== 1) ||
    episodeCount <= 0 ||
    currentIndex < 0 ||
    currentIndex >= episodeCount
  ) {
    return null;
  }

  const nextIndex = currentIndex + direction;

  return nextIndex >= 0 && nextIndex < episodeCount ? nextIndex : null;
}