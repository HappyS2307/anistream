"use client";

import { useMemo, useState } from "react";
import { parseSimplePaste } from "@/lib/admin/bulk-link-import.mjs";

type Option = { id: string; name: string };
type Props = {
  contents: Array<{ slug: string; title: string; kind: string }>;
  servers: Option[];
  providers: Option[];
};

export function BulkLinkImportForm({ contents, servers, providers }: Props) {
  const [kind, setKind] = useState<"stream" | "download">("stream");
  const [slug, setSlug] = useState(contents[0]?.slug ?? "");
  const [season, setSeason] = useState("1");
  const [startEpisode, setStartEpisode] = useState("1");
  const [serverName, setServerName] = useState(servers[0]?.name ?? "");
  const [providerName, setProviderName] = useState(providers[0]?.name ?? "");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [results, setResults] = useState<Array<{row:number;status:string;message:string}>>([]);
  const selected = contents.find((item) => item.slug === slug);
  const parsed = useMemo(() => parseSimplePaste(content, {
    kind, contentSlug: slug, contentKind: selected?.kind ?? "",
    seasonNumber: season, startingEpisode: startEpisode, serverName, providerName,
  }), [content, kind, slug, selected?.kind, season, startEpisode, serverName, providerName]);

  async function submit() {
    setNotice("");
    setResults([]);
    if (parsed.errors.length) {
      setNotice(parsed.errors.map((error) => error.message).join(" "));
      return;
    }
    if (!parsed.rows.length) {
      setNotice("Paste at least one URL.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/bulk-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, rows: parsed.rows }),
      });
      const payload = await response.json();
      if (!response.ok && !payload.summary) {
        setNotice(payload.error ?? "Import request failed.");
      } else {
        const summary = payload.summary;
        setNotice(`Finished: ${summary.imported} imported, ${summary.skipped} skipped, ${summary.failed} failed.`);
        setResults(payload.results ?? []);
      }
    } catch {
      setNotice("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-container" style={{ paddingBlock: "42px 80px", maxWidth: 900 }}>
      <p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> ADMIN TOOLS</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.05em", margin: "8px 0" }}>Bulk link import</h1>
      <p style={{ color: "var(--muted)", maxWidth: 680 }}>Import up to 100 approved streaming or download URLs in one batch. Every URL is checked on the server against the selected enabled provider.</p>

      <div className="surface-card" style={{ padding: 24, marginTop: 28, display: "grid", gap: 18 }}>
        <label>Import type
          <select className="form-control" value={kind} onChange={(e) => setKind(e.target.value as "stream" | "download")} style={{ display: "block", width: "100%", marginTop: 6 }}>
            <option value="stream">Streaming links</option><option value="download">Download links</option>
          </select>
        </label>
        <label>Title
          <select className="form-control" value={slug} onChange={(e) => setSlug(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
            {contents.map((item) => <option key={item.slug} value={item.slug}>{item.title} ({item.kind})</option>)}
          </select>
        </label>
        {selected?.kind !== "movie" && <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <label>Season number<input className="form-control" type="number" min="1" value={season} onChange={(e) => setSeason(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }} /></label>
          <label>Starting episode<input className="form-control" type="number" min="1" value={startEpisode} onChange={(e) => setStartEpisode(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }} /></label>
        </div>}
        {kind === "stream" ? <label>Streaming server
          <select className="form-control" value={serverName} onChange={(e) => setServerName(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
            {servers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </label> : <label>Download provider
          <select className="form-control" value={providerName} onChange={(e) => setProviderName(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
            {providers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </label>}
        <label>Links — one URL per line; optional format: <code>12 | https://...</code>
          <textarea className="form-control" value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder={"https://approved-host.example/embed/abc\nhttps://approved-host.example/embed/def"} style={{ display: "block", width: "100%", marginTop: 6, resize: "vertical" }} />
        </label>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>{parsed.rows.length} row(s) parsed · {parsed.errors.length} validation issue(s) · max 100 per batch</div>
        {notice && <p role="status" style={{ border: "1px solid var(--line)", padding: 12, margin: 0 }}>{notice}</p>}
        <button className="button button--primary" type="button" disabled={busy || !contents.length || (kind === "stream" ? !servers.length : !providers.length)} onClick={submit}>{busy ? "Importing…" : "Validate & import links"}</button>
        {results.length > 0 && <div aria-live="polite"><h2 style={{ fontSize: 18, marginBottom: 8 }}>Row results</h2><ul style={{ display: "grid", gap: 6, paddingLeft: 20 }}>{results.map((item) => <li key={item.row}><strong>Row {item.row} — {item.status}:</strong> {item.message}</li>)}</ul></div>}
      </div>
    </section>
  );
}
