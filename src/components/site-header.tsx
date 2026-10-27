import Link from "next/link";

const categories = [
  { label: "Anime", href: "/anime", id: "anime" },
  { label: "Drama", href: "/drama", id: "drama" },
  { label: "Web Series", href: "/web-series", id: "web-series" },
  { label: "Movies", href: "/movies", id: "movies" },
];

export function SiteHeader({ activeCategory }: { activeCategory?: string }) {
  return (
    <header className="site-header" id="top">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="AniStream home">
          <span className="brand__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand__name">
            ANI<span>STREAM</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Browse categories">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              aria-current={activeCategory === category.id ? "page" : undefined}
            >
              {category.label}
            </Link>
          ))}
        </nav>

        <Link className="site-header__action" href="/search">
          Search <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}