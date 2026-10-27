import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";

export default function NotFound() {
  return (
    <SiteFrame>
      <main id="main-content" className="not-found page-container">
        <p className="eyebrow">
          <span className="eyebrow__dot" aria-hidden="true" />
          404 / NOT IN THIS COLLECTION
        </p>
        <h1>This title is not here.</h1>
        <p>
          That address does not match a title in the AniStream sample catalogue.
        </p>
        <Link className="button button--primary" href="/">
          Return to AniStream <span aria-hidden="true">↗</span>
        </Link>
      </main>
    </SiteFrame>
  );
}