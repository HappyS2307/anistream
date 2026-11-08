import { Suspense } from "react";
import Link from "next/link";
import { AuthAccountControl } from "@/components/auth-account-control";

const categories = [
  { label: "Anime", href: "/anime", id: "anime" },
  { label: "Drama", href: "/drama", id: "drama" },
  { label: "Web Series", href: "/web-series", id: "web-series" },
  { label: "Movies", href: "/movies", id: "movies" },
];

export function SiteHeader({
  activeCategory,
  activePage,
}: {
  activeCategory?: string;
  activePage?: string;
}) {
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
          <Link href="/explore" aria-current={activePage === "discover" ? "page" : undefined}>Discover</Link>
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              aria-current={activeCategory === category.id ? "page" : undefined}
            >
              {category.label}
            </Link>
          ))}
          <Link href="/saved" aria-current={activePage === "saved" ? "page" : undefined}>Saved</Link>
          <Link href="/profile" aria-current={activePage === "profile" ? "page" : undefined}>Profile</Link>
        </nav>

        <div className="site-header__actions">
          <Link className="site-header__action" href="/search">
            Search <span aria-hidden="true">↗</span>
          </Link>
          <Suspense fallback={<SignInFallback />}>
            <AuthAccountControl />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

function SignInFallback() {
  return (
    <Link className="site-header__action" href="/login">
      Sign in <span aria-hidden="true">↗</span>
    </Link>
  );
}
