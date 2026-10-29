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
  const [contentOptions, setContentOptions] = useState(contents);
  const [slug, setSlug] = useState(contents[0]?.slug ?? "");
  const [contentSearch, setContentSearch] = useState("");
  const [searchPage, setSearchPage] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [season, setSeason] = useState("1");
  const [startEpisode, setStartEpisode] = useState("1");
  const [serverName, setServerName] = useState(servers[0]?.name ?? "");
  const [providerName, setProviderName] = useState(providers[0]?.name ?? "");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [results, setResults] = useState<Array<{row:number;status:string;message:string}>>([]);
  const selected = contentOptions.find((item) => item.slug === slug) ?? contents.find((item) => item.slug === slug);

  async function searchContent(append = false) {
    setSearching(true);
    setNotice("");
    const nextPage = append ? searchPage + 1 : 0;
    try {
      const params = new URLSearchParams({ q: contentSearch.trim(), page: String(nextPage) });
      const response = await fetch(`/api/admin/content-search?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setNotice(payload.error ?? "Content search failed.");
        return;
      }
      const items = Array.isArray(payload.items) ? payload.items as Array<{ slug: string; title: string; kind: string }> : [];
      setContentOptions((current) => append ? [...current, ...items.filter((item) => !current.some((existing) => existing.slug === item.slug))] : items);
      setSearchPage(nextPage);
      setSearchHasMore(Boolean(payload.hasMore));
      if (!append && items.length) setSlug(items[0].slug);
      if (!items.length && !append) setNotice("No titles found. Try another search.");
    } catch {
      setNotice("Network error while searching titles.");
    } finally {
      setSearching(false);
    }
  }
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
        <label>Search titles
          <input className="form-control" value={contentSearch} onChange={(e) => setContentSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchContent(false); } }} placeholder="Search by title or slug" style={{ display: "block", width: "100%", marginTop: 6 }} />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button className="button" type="button" disabled={searching} onClick={() => void searchContent(false)}>{searching ? "Searching…" : "Search titles"}</button>
          {searchHasMore && <button className="button" type="button" disabled={searching} onClick={() => void searchContent(true)}>Load 25 more</button>}
        </div>
        <label>Title
          <select className="form-control" value={slug} onChange={(e) => setSlug(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
            {contentOptions.map((item) => <option key={item.slug} value={item.slug}>{item.title} ({item.kind})</option>)}
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
        <button className="button button--primary" type="button" disabled={busy || !contentOptions.length || !selected || (kind === "stream" ? !servers.length : !providers.length)} onClick={submit}>{busy ? "Importing…" : "Validate & import links"}</button>
        {results.length > 0 && <div aria-live="polite"><h2 style={{ fontSize: 18, marginBottom: 8 }}>Row results</h2><ul style={{ display: "grid", gap: 6, paddingLeft: 20 }}>{results.map((item) => <li key={item.row}><strong>Row {item.row} — {item.status}:</strong> {item.message}</li>)}</ul></div>}
      </div>
    </section>
  );
}
