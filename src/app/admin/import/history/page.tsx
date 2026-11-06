import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";

type ImportRecord = {
  id: string;
  import_kind: "stream" | "download";
  status: "completed" | "partial" | "failed";
  records_total: number;
  records_imported: number;
  records_skipped: number;
  records_failed: number;
  created_at: string;
};

export default async function AdminImportHistoryPage() {
  const access = await getAdminAccess("links.import");
  if (access.status !== "authorized") {
    const message = access.status === "unauthenticated"
      ? "Sign in with an authorised admin account to view import history."
      : access.status === "forbidden"
        ? "Your account does not have link-import permission."
        : "Import history is unavailable. Check the database configuration.";
    return <SiteFrame><main className="page-container" style={{ paddingBlock: 56 }}><p className="eyebrow">ANISTREAM / PLAYBACK</p><h1>Import history</h1><p>{message}</p><Link className="button button--primary" href="/admin/import">Back to link import</Link></main></SiteFrame>;
  }

  const { data, error } = await access.client
    .from("import_history")
    .select("id,import_kind,status,records_total,records_imported,records_skipped,records_failed,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const records = (data ?? []) as ImportRecord[];

  return <SiteFrame><main className="page-container" style={{ paddingBlock: "42px 80px", maxWidth: 1100 }}>
    <p className="eyebrow">ANISTREAM / PLAYBACK OPERATIONS</p>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
      <div><h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", margin: "8px 0" }}>Import history</h1><p style={{ color: "var(--muted)" }}>Recent bulk link imports and their results.</p></div>
      <Link className="button button--primary" href="/admin/import">＋ New import</Link>
    </div>
    {error ? <p role="status" className="surface-card" style={{ padding: 18 }}>Could not load import history. Check the database migration and permissions.</p>
      : records.length === 0 ? <p className="surface-card" style={{ padding: 22, marginTop: 24 }}>No imports recorded yet. Completed imports will appear here.</p>
      : <div className="surface-card" style={{ overflowX: "auto", marginTop: 24 }}>
        <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", textAlign: "left" }}>
          <thead><tr>{["Date","Type","Status","Total","Imported","Skipped","Failed"].map(label=><th key={label} style={{ padding: 14, borderBottom: "1px solid var(--line)", color: "var(--muted)", fontSize: 12 }}>{label}</th>)}</tr></thead>
          <tbody>{records.map(record=><tr key={record.id}>
            <td style={{ padding: 14, borderBottom: "1px solid var(--line)" }}>{new Date(record.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
            <td style={{ padding: 14, borderBottom: "1px solid var(--line)", textTransform: "capitalize" }}>{record.import_kind}</td>
            <td style={{ padding: 14, borderBottom: "1px solid var(--line)" }}><span className={"admin-status admin-status--"+record.status}>{record.status}</span></td>
            {[record.records_total,record.records_imported,record.records_skipped,record.records_failed].map((value,index)=><td key={index} style={{ padding: 14, borderBottom: "1px solid var(--line)", fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString("en-IN")}</td>)}
          </tr>)}</tbody>
        </table>
      </div>}
    <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 14 }}>Showing the latest 50 recorded batches. Individual episode links are not exposed in this audit view.</p>
  </main></SiteFrame>;
}
