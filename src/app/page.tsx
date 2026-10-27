import Image from "next/image";
import { ContentRow } from "@/components/content-row";
import { SiteFrame } from "@/components/site-frame";
import { sampleCollections } from "@/data/sample-content";

export default function Home() {
  return (
    <SiteFrame>
      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__artwork">
            <Image
              src="/artwork/hero-coast.webp"
              alt="Illustrated moonlit coast with a lone traveler and a small boat"
              fill
              priority
              sizes="100vw"
            />
          </div>
          <div className="hero__shade" aria-hidden="true" />
          <div className="hero__content page-container">
            <p className="eyebrow hero__eyebrow">
              <span className="eyebrow__rule" aria-hidden="true" />
              FEATURED SAMPLE
              <span className="hero__eyebrow-note">ANIStream collection preview</span>
            </p>
            <h1 id="hero-title">
              The quiet
              <br />
              <span>between tides.</span>
            </h1>
            <p className="hero__summary">
              At the edge of a vanished ocean, a lighthouse keeper finds a map
              that only appears when the moon is low.
            </p>
            <div className="hero__details">
              <span className="sample-pill">Sample title</span>
              <span>Anime</span>
              <span className="hero__detail-separator" aria-hidden="true" />
              <span>Illustrative synopsis</span>
            </div>
            <div className="hero__actions">
              <a className="button button--primary" href="#anime">
                Explore sample titles
                <span aria-hidden="true">↘</span>
              </a>
              <a className="button button--quiet" href="#collections">
                Browse the collection
              </a>
            </div>
          </div>
          <p className="hero__frame-note" aria-hidden="true">
            ANI / 001
          </p>
        </section>

        <section className="catalogue page-container" id="collections">
          <div className="catalogue__intro">
            <div>
              <p className="eyebrow">
                <span className="eyebrow__dot" aria-hidden="true" />
                THE SAMPLE CATALOGUE
              </p>
              <h2>
                Find your next
                <br className="mobile-break" /> world.
              </h2>
            </div>
            <p className="catalogue__note">
              A first look at the AniStream collection. Every title and synopsis
              here is sample content for this design preview.
            </p>
          </div>

          <div className="catalogue__rows">
            {sampleCollections.map((collection) => (
              <ContentRow key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      </main>
    </SiteFrame>
  );
}
