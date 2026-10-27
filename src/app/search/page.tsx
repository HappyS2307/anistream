import { Suspense } from "react";
import { ContentCard } from "@/components/content-card";
import { SearchForm } from "@/components/search-form";
import { SiteFrame } from "@/components/site-frame";
import { searchSampleTitles } from "@/data/sample-content";

type SearchParams = {
  q?: string | string[];
};

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <SiteFrame>
      <main id="main-content">
        <Suspense fallback={<SearchPageLoading />}>
          <SearchPageContent searchParams={searchParams} />
        </Suspense>
      </main>
    </SiteFrame>
  );
}

async function SearchPageContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parameters = await searchParams;
  const query = Array.isArray(parameters.q)
    ? (parameters.q[0] ?? "")
    : (parameters.q ?? "");
  const hasQuery = query.trim().length > 0;
  const results = hasQuery ? searchSampleTitles(query) : [];

  return (
    <section className="catalogue-page page-container" aria-labelledby="search-title">
      <div className="catalogue-page__intro">
        <p className="eyebrow">
          <span className="eyebrow__dot" aria-hidden="true" />
          SEARCH THE SAMPLE CATALOGUE
        </p>
        <h1 id="search-title">Find a story.</h1>
        <p className="catalogue-page__description">
          Search sample titles by name, category, or short description.
        </p>
      </div>

      <SearchForm query={query} />

      {hasQuery ? (
        results.length > 0 ? (
          <>
            <p className="search-results__summary" role="status">
              {results.length} sample {results.length === 1 ? "title" : "titles"} for
              {" "}
              <strong>“{query.trim()}”</strong>
            </p>
            <div className="content-row__grid catalogue-page__grid">
              {results.map((title) => (
                <ContentCard key={title.slug} title={title} headingLevel="h2" />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state search-empty" role="status">
            <p className="empty-state__title">No sample titles found</p>
            <p>Try a different title, category, or phrase.</p>
          </div>
        )
      ) : (
        <div className="empty-state search-empty">
          <p className="empty-state__title">Start with a title or a detail</p>
          <p>Search across all four sample collections.</p>
        </div>
      )}
    </section>
  );
}

function SearchPageLoading() {
  return (
    <section className="catalogue-page page-container" aria-busy="true">
      <p className="sr-only" role="status">
        Loading search
      </p>
      <div className="loading-line skeleton-shimmer" />
      <div className="search-loading-form skeleton-shimmer" />
      <div className="loading-grid catalogue-page__grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="poster-skeleton" aria-hidden="true">
            <div className="poster-skeleton__image skeleton-shimmer" />
            <div className="poster-skeleton__line skeleton-shimmer" />
            <div className="poster-skeleton__line--short skeleton-shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}