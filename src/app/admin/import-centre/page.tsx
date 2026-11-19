import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import { CatalogueImport } from "@/app/admin/content-import/catalogue-import";
import { getAdminAccess } from "@/lib/data/admin";

export default async function ImportCentrePage() {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") redirect("/admin");
  return (
    <SiteFrame>
      <main className="page-container" style={{ paddingBlock: "32px 72px", maxWidth: 1100 }}>
        <p className="eyebrow">ANISTREAM / ADMIN / IMPORT CENTRE</p>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
          <div><h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", letterSpacing: "-.05em" }}>Import Centre</h1>
          <p style={{ color: "var(--muted)", maxWidth: 720 }}>Import a title, all available seasons and episodes, then automatically check HindiAnime for matching playback links. Bulk catalogue jobs are available below. Only verified links from enabled streaming servers are saved.</p></div>
          <Link className="button button--quiet" href="/admin/import">Open link import ↗</Link>
        </header>
        <div className="surface-card" style={{ padding: 18, marginBlock: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <div><strong>01 · Search & select</strong><p style={{ color: "var(--muted)", marginBottom: 0 }}>Find the exact title on TMDB.</p></div>
          <div><strong>02 · Import everything</strong><p style={{ color: "var(--muted)", marginBottom: 0 }}>Title, metadata, seasons and episode records.</p></div>
          <div><strong>03 · Review & publish</strong><p style={{ color: "var(--muted)", marginBottom: 0 }}>Imported records remain Draft until you publish.</p></div>
          <div><strong>04 · Add playback links</strong><p style={{ color: "var(--muted)", marginBottom: 0 }}>Use approved provider/server links; missing sources are never invented.</p></div>
        </div>
        <CatalogueImport />
      </main>
    </SiteFrame>
  );
}
