import { Suspense } from "react";
import { ContentCard } from "@/components/content-card";
import { SearchForm } from "@/components/search-form";
import { SiteFrame } from "@/components/site-frame";
import { searchSampleTitles } from "@/data/sample-content";
import { getPublishedCatalogue } from "@/lib/catalogue";

type SearchParams = { q?: string | string[] };

export default function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <SiteFrame><main id="main-content"><Suspense fallback={<SearchPageLoading />}><SearchPageContent searchParams={searchParams} /></Suspense></main></SiteFrame>;
}

async function SearchPageContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const parameters = await searchParams;
  const query = Array.isArray(parameters.q) ? (parameters.q[0] ?? "") : (parameters.q ?? "");
  const hasQuery = query.trim().length > 0;
  const liveResults = hasQuery ? await getPublishedCatalogue({ query, limit: 48 }) : [];
  const results = liveResults.length ? liveResults : hasQuery ? searchSampleTitles(query) : [];
  const usingSamples = liveResults.length === 0 && results.length > 0;

  return (
    <section className="catalogue-page page-container" aria-labelledby="search-title">
      <div className="catalogue-page__intro">
        <p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> SEARCH ANISTREAM</p>
        <h1 id="search-title">Find a story.</h1>
        <p className="catalogue-page__description">Search published titles by name, alternate title, genre, tags or synopsis.</p>
      </div>
      <SearchForm query={query} />
      {hasQuery ? results.length ? <>
        <p className="search-results__summary" role="status">{results.length}{usingSamples ? " sample" : ""} {results.length === 1 ? "title" : "titles"} for <strong>“{query.trim()}”</strong></p>
        <div className="content-row__grid catalogue-page__grid">{results.map((title) => <ContentCard key={title.slug} title={title} headingLevel="h2" />)}</div>
      </> : <div className="empty-state search-empty" role="status"><p className="empty-state__title">No titles found</p><p>Try another title, category, or phrase.</p></div>
      : <div className="empty-state search-empty"><p className="empty-state__title">Start with a title or a detail</p><p>Search the AniStream catalogue.</p></div>}
    </section>
  );
}

function SearchPageLoading() {
  return <section className="catalogue-page page-container" aria-busy="true"><p className="sr-only" role="status">Loading search</p><div className="loading-line skeleton-shimmer" /><div className="search-loading-form skeleton-shimmer" /><div className="loading-grid catalogue-page__grid">{Array.from({ length: 4 }, (_, index) => <div key={index} className="poster-skeleton" aria-hidden="true"><div className="poster-skeleton__image skeleton-shimmer" /><div className="poster-skeleton__line skeleton-shimmer" /><div className="poster-skeleton__line--short skeleton-shimmer" /></div>)}</div></section>;
}
