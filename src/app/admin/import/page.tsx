import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess, getLinkImportContext } from "@/lib/data/admin";
import { BulkLinkImportForm } from "./bulk-link-import-form";

export default async function AdminBulkImportPage() {
  const access = await getAdminAccess("links.import");

  if (access.status !== "authorized") {
    const message = access.status === "unauthenticated"
      ? "Sign in with an authorized admin account to use bulk import."
      : access.status === "forbidden"
        ? "Your account does not have link-import permission."
        : access.status === "unconfigured"
          ? "Supabase authentication is not configured yet."
          : "Admin data is unavailable. Check the Supabase migrations and configuration.";
    return <SiteFrame><main className="page-container" style={{ paddingBlock: 64 }}><p className="eyebrow">ADMIN / BULK IMPORT</p><h1 style={{ fontSize: 32 }}>Bulk link import</h1><p style={{ color: "var(--muted)", maxWidth: 640 }}>{message}</p><p><Link className="button button--quiet" href="/login?next=%2Fadmin%2Fimport">Go to sign in</Link></p></main></SiteFrame>;
  }

  const firstPage = await access.client.from("content").select("slug,title,kind").order("title").range(0, 24);
  if (firstPage.error) {
    return <SiteFrame><main className="page-container" style={{ paddingBlock: 64 }}><h1 style={{ fontSize: 32 }}>Bulk link import</h1><p style={{ color: "var(--muted)" }}>Admin content is unavailable. Check the database migrations and permissions.</p></main></SiteFrame>;
  }

  const context = await getLinkImportContext((firstPage.data ?? []).map((item) => item.slug));
  if (context.status !== "ready") {
    return <SiteFrame><main className="page-container" style={{ paddingBlock: 64 }}><h1 style={{ fontSize: 32 }}>Bulk link import</h1><p style={{ color: "var(--muted)" }}>Admin data is unavailable. Check the Supabase migrations and configuration.</p></main></SiteFrame>;
  }

  return <SiteFrame><main><BulkLinkImportForm contents={(firstPage.data ?? []).map(({ slug, title, kind }) => ({ slug, title, kind }))} servers={context.context.streamingServers.map(({ id, name }) => ({ id, name }))} providers={context.context.downloadProviders.map(({ id, name }) => ({ id, name }))} /></main></SiteFrame>;
}
