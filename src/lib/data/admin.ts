import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminPermission =
  | "links.import"
  | "streaming.manage"
  | "downloads.manage";

type AdminClient = SupabaseClient<Database>;

export type AdminAccess =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "schema-unavailable" }
  | { status: "authorized"; client: AdminClient; userId: string };

export async function getAdminAccess(
  permission: AdminPermission,
): Promise<AdminAccess> {
  const client = await createSupabaseServerClient();

  if (!client) {
    return { status: "unconfigured" };
  }

  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError || !userData.user) {
    return { status: "unauthenticated" };
  }

  const { data: allowed, error: permissionError } = await client.rpc(
    "has_admin_permission",
    { permission_name: permission },
  );

  if (permissionError) {
    return { status: "schema-unavailable" };
  }

  if (!allowed) {
    return { status: "forbidden" };
  }

  return {
    status: "authorized",
    client,
    userId: userData.user.id,
  };
}

export type LinkImportContext = {
  contents: Array<{
    id: string;
    slug: string;
    kind: Database["public"]["Enums"]["content_kind"];
    title: string;
    publication_status: Database["public"]["Enums"]["publication_status"];
  }>;
  seasons: Array<{
    id: string;
    content_id: string;
    season_number: number;
  }>;
  episodes: Array<{
    id: string;
    season_id: string;
    episode_number: number;
    title: string;
  }>;
  streamingServers: Array<{
    id: string;
    name: string;
    hostname: string;
    protection_enabled: boolean;
  }>;
  downloadProviders: Array<{
    id: string;
    name: string;
    hostname: string;
  }>;
};

export type LinkImportContextResult =
  | Exclude<AdminAccess, { status: "authorized" }>
  | { status: "ready"; client: AdminClient; userId: string; context: LinkImportContext };

export async function getLinkImportContext(contentSlugs: string[] = []): Promise<LinkImportContextResult> {
  const access = await getAdminAccess("links.import");

  if (access.status !== "authorized") return access;

  const uniqueSlugs = [...new Set(contentSlugs.map((slug) => slug.trim()).filter(Boolean))].slice(0, 100);
  const [contentResult, serverResult, providerResult] = await Promise.all([
    uniqueSlugs.length
      ? access.client.from("content")
          .select("id,slug,kind,title,publication_status")
          .in("slug", uniqueSlugs)
      : Promise.resolve({ data: [], error: null }),
    access.client.from("streaming_servers")
      .select("id,name,hostname,protection_enabled")
      .eq("enabled", true)
      .order("name"),
    access.client.from("download_providers")
      .select("id,name,hostname")
      .eq("enabled", true)
      .order("name"),
  ]);

  if (contentResult.error || serverResult.error || providerResult.error) {
    return { status: "schema-unavailable" };
  }

  const contentIds = (contentResult.data ?? []).map((item) => item.id);
  const seasonResult = contentIds.length
    ? await access.client.from("seasons")
        .select("id,content_id,season_number")
        .in("content_id", contentIds)
    : { data: [], error: null };

  if (seasonResult.error) return { status: "schema-unavailable" };

  const seasonIds = (seasonResult.data ?? []).map((item) => item.id);
  const episodeResult = seasonIds.length
    ? await access.client.from("episodes")
        .select("id,season_id,episode_number,title")
        .in("season_id", seasonIds)
    : { data: [], error: null };

  if (episodeResult.error) return { status: "schema-unavailable" };

  return {
    status: "ready",
    client: access.client,
    userId: access.userId,
    context: {
      contents: contentResult.data ?? [],
      seasons: seasonResult.data ?? [],
      episodes: episodeResult.data ?? [],
      streamingServers: serverResult.data ?? [],
      downloadProviders: providerResult.data ?? [],
    },
  };
}
