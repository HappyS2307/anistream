import { ContentCard } from "@/components/content-card";
import { SiteFrame } from "@/components/site-frame";
import { sampleTitles, searchSampleTitles } from "@/data/sample-content";
import { getPublishedCatalogue } from "@/lib/catalogue";
import type { ContentKind } from "@/lib/supabase/database.types";

type SearchParams = {
  q?: string | string[];
  kind?: string | string[];
};

const categories: { label: string; value: ContentKind | "all" }[] = [
  { label: "All titles", value: "all" },
  { label: "Anime", value: "anime" },
  { label: "Drama", value: "drama" },
  { label: "Web Series", value: "web_series" },
  { label: "Movies", value: "movie" },
];

const sampleCategory: Record<ContentKind, string> = {
  anime: "Anime",
  drama: "Drama",
  web_series: "Web Series",
  movie: "Movies",
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isContentKind(value: string): value is ContentKind {
  return value === "anime" || value === "drama" || value === "web_series" || value === "movie";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 120);
  const requestedKind = firstValue(params.kind);
  const kind = isContentKind(requestedKind) ? requestedKind : undefined;

  const liveTitles = await getPublishedCatalogue({
    ...(kind ? { kind } : {}),
    ...(query ? { query } : {}),
    limit: 48,
  });

  const sampleMatches = query ? searchSampleTitles(query) : sampleTitles;
  const filteredSamples = sampleMatches.filter((title) =>
    kind ? title.category === sampleCategory[kind] : true,
  );
  const titles = liveTitles.length > 0 ? liveTitles : filteredSamples;
  const usingSamples = liveTitles.length === 0 && filteredSamples.length > 0;

  return (
    <SiteFrame activePage="discover">
      <main id="main-content">
        <section className="catalogue-page page-container" aria-labelledby="explore-title">
          <div className="catalogue-page__intro">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" /> DISCOVER ANISTREAM
            </p>
            <h1 id="explore-title">Explore the library.</h1>
            <p className="catalogue-page__description">
              Browse anime, drama, web series and movies. Search by title or a story detail.
            </p>
          </div>

          <form className="search-form" action="/explore" method="get" role="search">
            <label htmlFor="explore-query">Search the catalogue</label>
            <div className="search-form__controls">
              <input
                id="explore-query"
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search titles and descriptions"
                maxLength={120}
                autoComplete="off"
              />
              {kind ? <input type="hidden" name="kind" value={kind} /> : null}
              <button className="button button--primary" type="submit">
                Search <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>

          <nav className="home-quick-nav explore-filters" aria-label="Filter by category">
            {categories.map((category) => {
              const href = category.value === "all"
                ? query ? `/explore?q=${encodeURIComponent(query)}` : "/explore"
                : `/explore?kind=${category.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
              const active = category.value === "all" ? !kind : kind === category.value;
              return (
                <a key={category.value} href={href} aria-current={active ? "page" : undefined}>
                  {category.label}<span aria-hidden="true">↗</span>
                </a>
              );
            })}
          </nav>

          <p className="catalogue-page__count" role="status">
            {titles.length}{usingSamples ? " sample" : ""} {titles.length === 1 ? "title" : "titles"} shown
            {query ? ` for “${query}”` : ""}. {usingSamples ? "Illustrative preview content." : "Showing the latest available catalogue entries."}
          </p>

          {titles.length > 0 ? (
            <div className="content-row__grid catalogue-page__grid">
              {titles.map((title) => (
                <ContentCard key={title.slug} title={title} headingLevel="h2" />
              ))}
            </div>
          ) : (
            <div className="empty-state search-empty" role="status">
              <p className="empty-state__title">No titles found</p>
              <p>Try another search or choose a different category.</p>
            </div>
          )}
        </section>
      </main>
    </SiteFrame>
  );
}
