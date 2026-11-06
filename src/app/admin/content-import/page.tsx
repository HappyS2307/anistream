import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";
import { ContentCsvImportForm } from "./content-csv-import-form";

export default async function AdminContentImportPage() {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") {
    const message = access.status === "unauthenticated" ? "Sign in with an authorized content-admin account." : access.status === "forbidden" ? "Your account does not have content-management permission." : access.status === "unconfigured" ? "Supabase authentication is not configured." : "Content import is unavailable. Verify database permissions.";
    return <SiteFrame><main className="page-container" style={{ paddingBlock: 64 }}><p className="eyebrow">ADMIN / CONTENT CATALOGUE</p><h1 style={{ fontSize: 32 }}>Bulk content import</h1><p style={{ color: "var(--muted)", maxWidth: 640 }}>{message}</p><Link className="button button--quiet" href="/login?next=%2Fadmin%2Fcontent-import">Go to sign in</Link></main></SiteFrame>;
  }
  return <SiteFrame><main><ContentCsvImportForm /></main></SiteFrame>;
}
