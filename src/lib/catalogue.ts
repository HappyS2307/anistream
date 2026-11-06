import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentKind } from "@/lib/supabase/database.types";
import type { SampleTitle } from "@/data/sample-content";

export type CatalogueRecord = SampleTitle & {
  id: string;
  kind: ContentKind;
  synopsis: string;
  releaseYear: number | null;
  rating: number | null;
  posterUrl: string | null;
  bannerUrl: string | null;
  isSample: false;
};

const categoryByKind: Record<ContentKind, SampleTitle["category"]> = {
  anime: "Anime",
  drama: "Drama",
  web_series: "Web Series",
  movie: "Movies",
};

const fallbackArtwork = "/artwork/hero-coast.webp";

function toCatalogueRecord(row: {
  id: string;
  slug: string;
  kind: ContentKind;
  title: string;
  synopsis: string | null;
  artwork_url: string | null;
  poster_url: string | null;
  banner_url: string | null;
  release_year: number | null;
  rating: number | null;
}): CatalogueRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: categoryByKind[row.kind],
    description: row.synopsis ?? "",
    artwork: row.poster_url ?? row.artwork_url ?? fallbackArtwork,
    kind: row.kind,
    synopsis: row.synopsis ?? "",
    releaseYear: row.release_year,
    rating: row.rating,
    posterUrl: row.poster_url,
    bannerUrl: row.banner_url,
    isSample: false,
  };
}

export async function getPublishedCatalogue(options: {
  kind?: ContentKind;
  query?: string;
  limit?: number;
  cursor?: { createdAt: string; id: string };
} = {}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  // This is a per-request page size, not a catalogue-wide record cap.
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 48);
  let request = supabase
    .from("content")
    .select("id,slug,kind,title,synopsis,artwork_url,poster_url,banner_url,release_year,rating")
    .eq("publication_status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    request = request.or(`created_at.lt.${options.cursor.createdAt},and(created_at.eq.${options.cursor.createdAt},id.lt.${options.cursor.id})`);
  }

  if (options.kind) request = request.eq("kind", options.kind);
  const query = options.query?.trim();
  if (query) {
    request = request.textSearch("search_document", query, {
      type: "websearch",
      config: "simple",
    });
  }

  const { data, error } = await request;
  if (error) {
    console.error("Catalogue query failed:", error.message);
    return [];
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  return pageRows.map(toCatalogueRecord);
}

export async function getPublishedTitle(slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("content")
    .select("id,slug,kind,title,synopsis,artwork_url,poster_url,banner_url,release_year,rating")
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();

  if (error) {
    console.error("Catalogue title query failed:", error.message);
    return null;
  }

  return data ? toCatalogueRecord(data) : null;
}
