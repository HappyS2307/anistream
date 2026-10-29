import { ContentCard } from "@/components/content-card";
import type { SampleCollection } from "@/data/sample-content";

export function ContentRow({ collection }: { collection: SampleCollection }) {
  return (
    <section
      className="content-row"
      id={collection.id}
      aria-labelledby={`${collection.id}-heading`}
    >
      <div className="content-row__heading">
        <div>
          <p className="content-row__eyebrow">A sample collection</p>
          <h2 id={`${collection.id}-heading`}>{collection.name}</h2>
        </div>
        <span className="content-row__count">
          {collection.titles.length} sample titles
        </span>
      </div>

      {collection.titles.length > 0 ? (
        <div className="content-row__grid">
          {collection.titles.map((title) => (
            <ContentCard key={title.title} title={title} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state__title">Nothing in this collection yet</p>
          <p>New sample titles will appear here.</p>
        </div>
      )}
    </section>
  );
}