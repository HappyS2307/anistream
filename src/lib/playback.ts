import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlayerEpisode, PlayerSource } from "@/lib/player/player-utils.mjs";
import type { ContentKind } from "@/lib/supabase/database.types";

type ServerRow = {
  id: string;
  name: string;
  hostname: string;
  protection_enabled: boolean;
};

type SourceRow = {
  id: string;
  embed_url: string;
  server_id: string;
  episode_id?: string | null;
};

function mapSource(row: SourceRow, servers: Map<string, ServerRow>): PlayerSource | null {
  const server = servers.get(row.server_id);
  if (!server) return null;
  return {
    id: row.id,
    serverName: server.name,
    embedUrl: row.embed_url,
    protectionEnabled: server.protection_enabled,
    allowedHost: server.hostname,
  };
}

export async function getPublishedPlayback(
  contentId: string,
  kind: ContentKind,
): Promise<PlayerEpisode[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: serverRows, error: serverError } = await supabase
    .from("streaming_servers")
    .select("id,name,hostname,protection_enabled")
    .eq("enabled", true)
    .order("name")
    .limit(100);

  if (serverError || !serverRows?.length) {
    if (serverError) console.error("Playback server query failed:", serverError.message);
    return [];
  }
  const servers = new Map(serverRows.map((server) => [server.id, server]));

  if (kind === "movie") {
    const { data, error } = await supabase
      .from("streaming_sources")
      .select("id,embed_url,server_id")
      .eq("content_id", contentId)
      .eq("enabled", true)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Movie playback sources query failed:", error.message);
      return [];
    }

    const sources = (data ?? [])
      .map((row) => mapSource(row, servers))
      .filter((source): source is PlayerSource => source !== null);
    return sources.length ? [{ id: contentId, label: "Movie", sources }] : [];
  }

  const { data: seasons, error: seasonsError } = await supabase
    .from("seasons")
    .select("id,season_number")
    .eq("content_id", contentId)
    .order("season_number", { ascending: true })
    .limit(100);

  if (seasonsError || !seasons?.length) {
    if (seasonsError) console.error("Playback seasons query failed:", seasonsError.message);
    return [];
  }

  const seasonIds = seasons.map((season) => season.id);
  const { data: episodes, error: episodesError } = await supabase
    .from("episodes")
    .select("id,season_id,episode_number,title")
    .in("season_id", seasonIds)
    .order("episode_number", { ascending: true })
    .limit(500);

  if (episodesError || !episodes?.length) {
    if (episodesError) console.error("Playback episodes query failed:", episodesError.message);
    return [];
  }

  const episodeIds = episodes.map((episode) => episode.id);
  const { data: sourceRows, error: sourcesError } = await supabase
    .from("streaming_sources")
    .select("id,embed_url,server_id,episode_id")
    .in("episode_id", episodeIds)
    .eq("enabled", true)
    .order("created_at", { ascending: true })
    .limit(2000);

  if (sourcesError) {
    console.error("Episode playback sources query failed:", sourcesError.message);
    return [];
  }

  const sourcesByEpisode = new Map<string, PlayerSource[]>();
  for (const row of sourceRows ?? []) {
    const source = mapSource(row, servers);
    if (!source || !row.episode_id) continue;
    const existing = sourcesByEpisode.get(row.episode_id) ?? [];
    existing.push(source);
    sourcesByEpisode.set(row.episode_id, existing);
  }

  const seasonNumberById = new Map(seasons.map((season) => [season.id, season.season_number]));
  return episodes.map((episode): PlayerEpisode => ({
    id: episode.id,
    label: `S${seasonNumberById.get(episode.season_id) ?? 1} · E${episode.episode_number} — ${episode.title}`,
    sources: sourcesByEpisode.get(episode.id) ?? [],
  }));
}
