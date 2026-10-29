import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export function SiteFrame({
  children,
  activeCategory,
}: {
  children: ReactNode;
  activeCategory?: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader activeCategory={activeCategory} />
      {children}
      <footer className="site-footer">
        <div className="page-container site-footer__inner">
          <Link className="brand brand--footer" href="/" aria-label="AniStream home">
            <span className="brand__mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="brand__name">
              ANI<span>STREAM</span>
            </span>
          </Link>
          <p>Stories, collected with care.</p>
          <a className="site-footer__top" href="#top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </>
  );
}