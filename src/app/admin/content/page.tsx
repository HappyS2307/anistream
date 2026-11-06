import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";
import { ContentManager } from "./content-manager";

export default async function AdminContentPage() {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") {
    const message = access.status === "unauthenticated" ? "Sign in with an authorized content-admin account." : access.status === "forbidden" ? "This account does not have content-management permission." : "Content management is unavailable.";
    return <SiteFrame><main className="page-container" style={{paddingBlock:64}}><p className="eyebrow">ANISTREAM / ADMIN</p><h1>Content catalogue</h1><p>{message}</p><Link className="button" href="/login?next=%2Fadmin%2Fcontent">Sign in</Link></main></SiteFrame>;
  }
  return <SiteFrame><main><ContentManager /></main></SiteFrame>;
}
