import Image from "next/image";
import Link from "next/link";
import { ContentRow } from "@/components/content-row";
import { SiteFrame } from "@/components/site-frame";
import { sampleCollections, type SampleCollection } from "@/data/sample-content";
import { getFeaturedTitle, getHomepageSections, getPublishedCatalogue } from "@/lib/catalogue";

const kinds = ["anime", "drama", "web_series", "movie"] as const;

export default async function Home() {
  const [anime, drama, series, movies, latest, featuredTitle, homepageSections] = await Promise.all([
    getPublishedCatalogue({ kind: "anime", limit: 12 }),
    getPublishedCatalogue({ kind: "drama", limit: 12 }),
    getPublishedCatalogue({ kind: "web_series", limit: 12 }),
    getPublishedCatalogue({ kind: "movie", limit: 12 }),
    getPublishedCatalogue({ limit: 12 }),
    getFeaturedTitle(),
    getHomepageSections(),
  ]);

  const liveCollections: SampleCollection[] = [
    { id: "anime", name: "Anime" as SampleCollection["name"], titles: anime },
    { id: "drama", name: "Drama" as SampleCollection["name"], titles: drama },
    { id: "web-series", name: "Web Series" as SampleCollection["name"], titles: series },
    { id: "movies", name: "Movies" as SampleCollection["name"], titles: movies },
  ].filter((collection) => collection.titles.length > 0);

  const availableCollections = liveCollections.length ? liveCollections : sampleCollections;
  const collectionMap = new Map(availableCollections.map((collection) => [collection.id, collection]));
  const collections = homepageSections
    .filter((section) => section.enabled && ["anime","drama","web_series","movies"].includes(section.section_key))
    .sort((a,b) => a.sort_order-b.sort_order)
    .map((section) => {
      const id = section.section_key === "web_series" ? "web-series" : section.section_key;
      const collection = collectionMap.get(id);
      return collection ? { ...collection, name: section.title as SampleCollection["name"] } : null;
    })
    .filter((collection): collection is SampleCollection => collection !== null);
  const featured = featuredTitle ?? anime[0] ?? drama[0] ?? series[0] ?? movies[0] ?? null;
  const heroArtwork = featured?.bannerUrl ?? featured?.posterUrl ?? featured?.artwork ?? "/artwork/hero-coast.webp";
  const totalLoaded = anime.length + drama.length + series.length + movies.length;

  return (
    <SiteFrame>
      <main id="main-content" className="home-page">
        <section className={`hero home-hero ${featured ? "home-hero--featured" : ""}`} aria-labelledby="hero-title">
          <div className="hero__artwork home-hero__artwork">
            {featured ? (
              <Image src={heroArtwork} alt="" fill priority unoptimized sizes="100vw" />
            ) : (
              <Image src="/artwork/hero-coast.webp" alt="Illustrated moonlit coast with a lone traveler and a small boat" fill priority sizes="100vw" />
            )}
          </div>
          <div className="hero__shade home-hero__shade" aria-hidden="true" />
          <div className="hero__content page-container home-hero__content">
            <p className="eyebrow hero__eyebrow">
              <span className="eyebrow__rule" aria-hidden="true" />
              {featured ? "FEATURED ON ANISTREAM" : "YOUR NEXT OBSESSION STARTS HERE"}
              <span className="hero__eyebrow-note">Anime · Drama · Series · Films</span>
            </p>
            {featured ? (
              <>
                <h1 id="hero-title" className="home-hero__title">{featured.title}</h1>
                <p className="hero__summary">{featured.synopsis || featured.description || "Discover your next favourite story on AniStream."}</p>
                <div className="hero__details">
                  <span className="sample-pill">{featured.category}</span>
                  {featured.releaseYear ? <span>{featured.releaseYear}</span> : null}
                  {featured.rating ? <span>★ {featured.rating.toFixed(1)}</span> : null}
                </div>
                <div className="hero__actions">
                  <Link className="button button--primary" href={`/title/${featured.slug}`}>View details <span aria-hidden="true">↗</span></Link>
                  <Link className="button button--quiet" href="/explore">Explore library</Link>
                </div>
              </>
            ) : (
              <>
                <h1 id="hero-title">Find your<br /><span>next world.</span></h1>
                <p className="hero__summary">One destination for anime, drama, series and films. Discover something worth staying in for.</p>
                <div className="hero__details"><span className="sample-pill">Discover AniStream</span><span>Anime · Drama · Films</span></div>
                <div className="hero__actions">
                  <a className="button button--primary" href="#collections">Explore AniStream <span aria-hidden="true">↘</span></a>
                  <Link className="button button--quiet" href="/search">Search titles</Link>
                </div>
              </>
            )}
          </div>
          <p className="hero__frame-note" aria-hidden="true">ANI / 001</p>
          {featured ? <div className="home-hero__counter"><span>01</span><i /> FEATURED TITLE</div> : null}
        </section>

        <nav className="home-quick-nav page-container" aria-label="Browse categories">
          {kinds.map((kind) => {
            const label = kind === "web_series" ? "Web Series" : kind === "movie" ? "Movies" : kind === "anime" ? "Anime" : "Drama";
            const href = kind === "web_series" ? "/explore?kind=web_series" : kind === "movie" ? "/explore?kind=movie" : `/explore?kind=${kind}`;
            return <Link key={kind} href={href}>{label}<span aria-hidden="true">↗</span></Link>;
          })}
          <Link className="home-quick-nav__all" href="/explore">View all titles <span aria-hidden="true">→</span></Link>
        </nav>

        <section className="catalogue page-container home-catalogue" id="collections">
          <div className="catalogue__intro">
            <div><p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> THE ANISTREAM LIBRARY</p><h2>Stories worth<br className="mobile-break" /> staying for.</h2></div>
            <p className="catalogue__note">{totalLoaded ? "Fresh discoveries across anime, drama, series and films. Pick a world and settle in." : "Your next favourite is on its way. New titles will appear here as they are published."}</p>
          </div>
          {homepageSections.filter((section) => section.enabled).sort((a,b)=>a.sort_order-b.sort_order).map((section) => {
            if (section.section_key === "latest") return (
              <div className="home-latest" key={section.section_key}>
                <div className="home-section-heading"><div><p className="content-row__eyebrow">FRESH FROM THE LIBRARY</p><h2>{section.title}</h2></div><Link href="/explore">Explore all <span aria-hidden="true">↗</span></Link></div>
                {latest.length ? (
                  <div className="content-row__grid home-poster-rail">
                    {latest.map((title) => (
                      <article className="poster-card" key={title.id}>
                        <Link className="poster-card__link" href={`/title/${title.slug}`} aria-label={`View details for ${title.title}`}>
                          <div className="poster-card__artwork"><Image alt={`Poster for ${title.title}`} src={title.artwork} fill unoptimized sizes="(max-width: 720px) 42vw, 16vw" /></div>
                          <div className="poster-card__copy"><p className="poster-card__category">{title.category}</p><h3>{title.title}</h3><p className="poster-card__description">{title.description}</p></div>
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : <p className="home-empty-note">New titles will appear here as they are published.</p>}
              </div>
            );
            if (section.section_key === "discover_banner") return (
              <div className="home-discover-banner" key={section.section_key}>
                <div><p className="eyebrow"><span className="eyebrow__dot" /> YOUR NEXT WATCH IS WAITING</p><h2>{section.title}</h2></div>
                <Link className="button button--primary" href="/explore">Explore the library <span aria-hidden="true">↗</span></Link>
              </div>
            );
            const collectionKey = section.section_key === "web_series" ? "web-series" : section.section_key;
            const collection = collections.find((item) => item.id === collectionKey);
            return collection ? <ContentRow key={section.section_key} collection={{...collection,name:section.title as SampleCollection["name"]}} /> : null;
          })}
        </section>
      </main>
    </SiteFrame>
  );
}
