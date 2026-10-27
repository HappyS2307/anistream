import Image from "next/image";
import Link from "next/link";
import type { SampleTitle } from "@/data/sample-content";

export function ContentCard({
  title,
  headingLevel = "h3",
}: {
  title: SampleTitle;
  headingLevel?: "h2" | "h3";
}) {
  const TitleHeading = headingLevel;

  return (
    <article className="poster-card">
      <Link
        className="poster-card__link"
        href={`/title/${title.slug}`}
        aria-label={`View details for ${title.title}, sample ${title.category} title`}
      >
        <div className="poster-card__artwork">
          <Image
            alt={`Sample poster artwork for ${title.title}`}
            src={title.artwork}
            fill
            sizes="(max-width: 720px) 46vw, (max-width: 980px) 29vw, 23vw"
          />
          <span className="poster-card__sample">Sample</span>
        </div>
        <div className="poster-card__copy">
          <p className="poster-card__category">{title.category}</p>
          <TitleHeading>{title.title}</TitleHeading>
          <p className="poster-card__description">{title.description}</p>
        </div>
      </Link>
    </article>
  );
}

export function PosterSkeleton() {
  return (
    <div className="poster-skeleton" aria-hidden="true">
      <div className="poster-skeleton__image skeleton-shimmer" />
      <div className="poster-skeleton__line skeleton-shimmer" />
      <div className="poster-skeleton__line--short skeleton-shimmer" />
    </div>
  );
}