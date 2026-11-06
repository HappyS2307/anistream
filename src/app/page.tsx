import Image from "next/image";
import { ContentRow } from "@/components/content-row";
import { SiteFrame } from "@/components/site-frame";
import { sampleCollections, type SampleCollection } from "@/data/sample-content";
import { getPublishedCatalogue } from "@/lib/catalogue";

export default async function Home() {
  const liveTitles = await getPublishedCatalogue({ limit: 48 });
  const collections: SampleCollection[] = liveTitles.length
    ? (["anime", "drama", "web_series", "movie"] as const)
        .map((kind) => ({
          id: kind === "web_series" ? "web-series" : kind === "movie" ? "movies" : kind,
          name: kind === "web_series" ? "Web Series" : kind === "movie" ? "Movies" : kind === "anime" ? "Anime" : "Drama",
          titles: liveTitles.filter((title) => title.kind === kind),
        }))
        .filter((collection) => collection.titles.length > 0)
    : sampleCollections;

  return (
    <SiteFrame>
      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__artwork">
            <Image src="/artwork/hero-coast.webp" alt="Illustrated moonlit coast with a lone traveler and a small boat" fill priority sizes="100vw" />
          </div>
          <div className="hero__shade" aria-hidden="true" />
          <div className="hero__content page-container">
            <p className="eyebrow hero__eyebrow">
              <span className="eyebrow__rule" aria-hidden="true" />
              {liveTitles.length ? "THE ANISTREAM COLLECTION" : "CATALOGUE PREVIEW"}
              <span className="hero__eyebrow-note">{liveTitles.length ? "Stories worth staying for" : "Your library is getting ready"}</span>
            </p>
            <h1 id="hero-title">Find your<br /><span>next world.</span></h1>
            <p className="hero__summary">Explore anime, drama, web series and films in one growing collection.</p>
            <div className="hero__details">
              <span className="sample-pill">{liveTitles.length ? `${liveTitles.length} titles loaded` : "Catalogue preview"}</span>
              <span>Anime · Drama · Films</span>
            </div>
            <div className="hero__actions">
              <a className="button button--primary" href="#collections">Explore catalogue <span aria-hidden="true">↘</span></a>
              <a className="button button--quiet" href="/search">Search titles</a>
            </div>
          </div>
          <p className="hero__frame-note" aria-hidden="true">ANI / 001</p>
        </section>
        <section className="catalogue page-container" id="collections">
          <div className="catalogue__intro">
            <div><p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> THE COLLECTION</p><h2>Find your<br className="mobile-break" /> next world.</h2></div>
            <p className="catalogue__note">{liveTitles.length ? "Browse the latest published titles from the AniStream catalogue." : "The catalogue is connected. Published titles will appear here as they are added."}</p>
          </div>
          <div className="catalogue__rows">
            {collections.map((collection) => <ContentRow key={collection.id} collection={collection} />)}
          </div>
        </section>
      </main>
    </SiteFrame>
  );
}
