import { PosterSkeleton } from "@/components/content-card";

export default function Loading() {
  return (
    <main className="loading-shell page-container" aria-busy="true">
      <p className="sr-only" role="status">
        Loading AniStream sample titles
      </p>
      <div className="loading-hero skeleton-shimmer" aria-hidden="true" />
      <section className="loading-section" aria-hidden="true">
        <div className="loading-line skeleton-shimmer" />
        <div className="loading-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <PosterSkeleton key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}