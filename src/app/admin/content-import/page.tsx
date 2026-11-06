import { redirect } from "next/navigation";

export default function ObsoleteContentImportPage(): never {
  redirect("/admin/content");
}
