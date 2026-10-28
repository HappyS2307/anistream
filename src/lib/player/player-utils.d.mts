export type PlayerSource = {
  id: string;
  serverName: string;
  embedUrl: string | null;
  protectionEnabled: boolean;
  demoOnly?: boolean;
  testSource?: boolean;
};

export type PlayerEpisode = {
  id: string;
  label: string;
  sources: PlayerSource[];
};

export const SUPPORTED_EMBED_HOSTS: readonly string[];
export function validateEmbedUrl(
  value: unknown,
  allowedHosts?: readonly string[],
): string | null;
export function getInitialServerId(
  sources: readonly PlayerSource[] | null | undefined,
): string | null;
export type PlayerSourceResolution = {
  source: PlayerSource | null;
  embedUrl: string | null;
  protectionEnabled: boolean;
  status: "ready" | "invalid" | "demo" | "missing";
};
export function resolvePlayerSource(
  sources: readonly PlayerSource[] | null | undefined,
  selectedServerId: string | null,
  allowedHosts?: readonly string[],
): PlayerSourceResolution;
export function getAdjacentEpisodeIndex(
  currentIndex: number,
  direction: -1 | 1,
  episodeCount: number,
): number | null;