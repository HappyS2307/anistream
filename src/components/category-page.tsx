import { notFound } from "next/navigation";
import { ContentCard } from "@/components/content-card";
import { SiteFrame } from "@/components/site-frame";
import { getSampleCollection } from "@/data/sample-content";

const introductions: Record<string, string> = {
  anime: "Animated worlds, small details, and stories with room to linger.",
  drama: "Character-led stories about change, connection, and what comes next.",
  "web-series": "Short-run sample series made for one more episode.",
  movies: "Standalone sample stories, selected for a quiet evening in.",
};

export function CategoryPage({ categoryId }: { categoryId: string }) {
  const collection = getSampleCollection(categoryId);

  if (!collection) {
    notFound();
  }

  return (
    <SiteFrame activeCategory={collection.id}>
      <main id="main-content">
        <section
          className="catalogue-page page-container"
          aria-labelledby="category-title"
        >
          <div className="catalogue-page__intro">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              SAMPLE COLLECTION
            </p>
            <h1 id="category-title">{collection.name}</h1>
            <p className="catalogue-page__description">
              {introductions[collection.id]}
            </p>
            <p className="catalogue-page__count">
              {collection.titles.length} sample titles
            </p>
          </div>

          {collection.titles.length > 0 ? (
            <div className="content-row__grid catalogue-page__grid">
              {collection.titles.map((title) => (
                <ContentCard key={title.slug} title={title} headingLevel="h2" />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state__title">No sample titles here yet</p>
              <p>New titles will appear in this collection.</p>
            </div>
          )}
        </section>
      </main>
    </SiteFrame>
  );
}