import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/data/admin";
import { SiteFrame } from "@/components/site-frame";
import { CatalogueImport } from "./catalogue-import";

export default async function CatalogueImportPage() {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") redirect("/admin");
  return <SiteFrame><CatalogueImport /></SiteFrame>;
}
