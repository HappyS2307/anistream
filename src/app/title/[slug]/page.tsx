import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StreamingPlayer } from "@/components/streaming-player";
import { SiteFrame } from "@/components/site-frame";
import { getDemoPlayback } from "@/data/demo-playback";
import { getSampleTitle, sampleCollections } from "@/data/sample-content";
import { getPublishedTitle } from "@/lib/catalogue";

export default async function TitlePage({ params }: PageProps<"/title/[slug]">) {
  const { slug } = await params;
  const liveTitle = await getPublishedTitle(slug);
  const title = liveTitle ?? getSampleTitle(slug);
  if (!title) notFound();

  const collection = sampleCollections.find((item) => item.name === title.category);
  const isSample = !liveTitle;
  const episodes = isSample ? getDemoPlayback(slug) : [];

  return (
    <SiteFrame activeCategory={collection?.id}>
      <main id="main-content">
        <article className="title-detail page-container">
          <Link className="title-detail__back" href={collection ? `/${collection.id}` : "/"}>
            <span aria-hidden="true">←</span> Back to {title.category}
          </Link>
          <div className="title-detail__layout">
            <div className="title-detail__poster">
              <Image src={title.artwork} alt={`Poster artwork for ${title.title}`} fill priority unoptimized sizes="(max-width: 720px) 72vw, 360px" />
              {isSample ? <span className="poster-card__sample">Sample</span> : null}
            </div>
            <div className="title-detail__copy">
              <p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> {isSample ? "DESIGN PREVIEW" : "ANISTREAM CATALOGUE"}</p>
              <p className="title-detail__category">{title.category}</p>
              <h1>{title.title}</h1>
              <dl className="title-detail__metadata">
                <div><dt>Category</dt><dd>{title.category}</dd></div>
                {liveTitle?.releaseYear ? <div><dt>Year</dt><dd>{liveTitle.releaseYear}</dd></div> : null}
                {liveTitle?.rating !== null && liveTitle?.rating !== undefined ? <div><dt>Rating</dt><dd>{liveTitle.rating}/10</dd></div> : null}
                <div><dt>Catalogue</dt><dd>{isSample ? "Sample entry" : "Published title"}</dd></div>
              </dl>
              <section className="title-detail__synopsis" aria-labelledby="synopsis-heading">
                <h2 id="synopsis-heading">Synopsis</h2>
                <p>{liveTitle?.synopsis || title.description || "Synopsis will be added soon."}</p>
              </section>
              {isSample ? (
                <StreamingPlayer title={title.title} episodes={episodes} />
              ) : (
                <section className="streaming-player" aria-label="Playback availability">
                  <div className="streaming-player__heading"><div><p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> PLAYBACK</p><h2>Watch {title.title}</h2></div></div>
                  <div className="streaming-player__message"><strong>Playback sources are not linked yet.</strong><span>Streaming links will appear here when an administrator adds and enables them.</span></div>
                </section>
              )}
            </div>
          </div>
        </article>
      </main>
    </SiteFrame>
  );
}
