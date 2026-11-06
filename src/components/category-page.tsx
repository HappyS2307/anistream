import { notFound } from "next/navigation";
import { ContentCard } from "@/components/content-card";
import { SiteFrame } from "@/components/site-frame";
import { getSampleCollection } from "@/data/sample-content";
import { getPublishedCatalogue } from "@/lib/catalogue";
import type { ContentKind } from "@/lib/supabase/database.types";

const config: Record<string, { kind: ContentKind; name: string; intro: string }> = {
  anime: { kind: "anime", name: "Anime", intro: "Animated worlds, small details, and stories with room to linger." },
  drama: { kind: "drama", name: "Drama", intro: "Character-led stories about change, connection, and what comes next." },
  "web-series": { kind: "web_series", name: "Web Series", intro: "Discover your next series." },
  movies: { kind: "movie", name: "Movies", intro: "Stories selected for your next movie night." },
};

export async function CategoryPage({ categoryId }: { categoryId: string }) {
  const category = config[categoryId];
  if (!category) notFound();

  const liveTitles = await getPublishedCatalogue({ kind: category.kind, limit: 48 });
  const sample = getSampleCollection(categoryId);
  const titles = liveTitles.length ? liveTitles : sample?.titles ?? [];
  const usingSamples = liveTitles.length === 0 && titles.length > 0;

  return (
    <SiteFrame activeCategory={categoryId}>
      <main id="main-content">
        <section className="catalogue-page page-container" aria-labelledby="category-title">
          <div className="catalogue-page__intro">
            <p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> {usingSamples ? "DESIGN PREVIEW" : "ANISTREAM COLLECTION"}</p>
            <h1 id="category-title">{category.name}</h1>
            <p className="catalogue-page__description">{category.intro}</p>
            <p className="catalogue-page__count">{titles.length}{usingSamples ? " sample" : ""} titles shown · latest 48</p>
          </div>
          {titles.length ? (
            <div className="content-row__grid catalogue-page__grid">
              {titles.map((title) => <ContentCard key={title.slug} title={title} headingLevel="h2" />)}
            </div>
          ) : (
            <div className="empty-state"><p className="empty-state__title">No titles published yet</p><p>New titles will appear here when they are published.</p></div>
          )}
        </section>
      </main>
    </SiteFrame>
  );
}
