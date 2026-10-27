import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import {
  getSampleTitle,
  sampleCollections,
  sampleTitles,
} from "@/data/sample-content";

export function generateStaticParams() {
  return sampleTitles.map((title) => ({ slug: title.slug }));
}

export default async function TitlePage({
  params,
}: PageProps<"/title/[slug]">) {
  const { slug } = await params;
  const title = getSampleTitle(slug);

  if (!title) {
    notFound();
  }

  const collection = sampleCollections.find(
    (sampleCollection) => sampleCollection.name === title.category,
  );

  return (
    <SiteFrame activeCategory={collection?.id}>
      <main id="main-content">
        <article className="title-detail page-container">
          <Link
            className="title-detail__back"
            href={collection ? `/${collection.id}` : "/"}
          >
            <span aria-hidden="true">←</span> Back to {title.category}
          </Link>

          <div className="title-detail__layout">
            <div className="title-detail__poster">
              <Image
                src={title.artwork}
                alt={`Sample poster artwork for ${title.title}`}
                fill
                priority
                sizes="(max-width: 720px) 72vw, 360px"
              />
              <span className="poster-card__sample">Sample</span>
            </div>

            <div className="title-detail__copy">
              <p className="eyebrow">
                <span className="eyebrow__dot" aria-hidden="true" />
                SAMPLE TITLE
              </p>
              <p className="title-detail__category">{title.category}</p>
              <h1>{title.title}</h1>

              <dl className="title-detail__metadata">
                <div>
                  <dt>Category</dt>
                  <dd>{title.category}</dd>
                </div>
                <div>
                  <dt>Catalogue</dt>
                  <dd>Sample entry</dd>
                </div>
              </dl>

              <section
                className="title-detail__synopsis"
                aria-labelledby="synopsis-heading"
              >
                <h2 id="synopsis-heading">Synopsis</h2>
                <p>{title.description}</p>
              </section>

              <p className="title-detail__note">
                This is sample catalogue content. No playback links or episode
                information are available.
              </p>
            </div>
          </div>
        </article>
      </main>
    </SiteFrame>
  );
}