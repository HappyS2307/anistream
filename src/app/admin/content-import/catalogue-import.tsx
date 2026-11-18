"use client";

import { useState } from "react";

type SearchItem = { id: number; title: string; original_title?: string; overview?: string; poster_url?: string; release_date?: string; rating?: number };

export function CatalogueImport() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"anime" | "drama" | "web_series" | "movie">("anime");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  async function search() {
    if (!query.trim()) return;
    setBusy(true); setNotice(""); setSelected(null); setSummary(null);
    try {
      const params = new URLSearchParams({ q: query.trim(), kind });
      const response = await fetch(`/api/admin/tmdb?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "TMDB search failed.");
      setResults(data.results ?? []);
      if (!(data.results ?? []).length) setNotice("No matching titles found.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Search failed."); }
    finally { setBusy(false); }
  }

  async function importSelected() {
    if (!selected) return;
    const confirmed = window.confirm(`Import "${selected.title}" with its TMDB seasons and episodes? The title will remain Draft and will not be public until you publish it.`);
    if (!confirmed) return;
    setBusy(true); setNotice("Fetching metadata, seasons and episode details…"); setSummary(null);
    try {
      const response = await fetch("/api/admin/content-import", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tmdb_id: selected.id, kind }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import failed.");
      setSummary(data.imported ?? null);
      setNotice("Import completed. Review the title and publish it manually when ready.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  }

  return <section className="page-container" style={{ maxWidth: 980, paddingBlock: "38px 80px" }}>
    <p className="eyebrow">ADMIN TOOLS</p>
    <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-.05em" }}>Catalogue auto import</h1>
    <p style={{ color: "var(--muted)", maxWidth: 700 }}>Search TMDB, select a title, then import its metadata, seasons and episode titles. Imported titles stay Draft. Manual content creation remains available.</p>
    <div className="surface-card" style={{ padding: 22, display: "grid", gap: 14, marginTop: 24 }}>
      <label>Content category<select className="form-control" value={kind} onChange={event => { setKind(event.target.value as typeof kind); setResults([]); setSelected(null); }} style={{ display: "block", width: "100%", marginTop: 6 }}>
        <option value="anime">Anime / Animation</option><option value="drama">Drama</option><option value="web_series">Web Series</option><option value="movie">Movie</option>
      </select></label>
      <form onSubmit={event => { event.preventDefault(); void search(); }} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input className="form-control" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title on TMDB" aria-label="Search title on TMDB" style={{ flex: "1 1 240px" }} />
        <button className="button button--primary" disabled={busy || !query.trim()}>{busy ? "Please wait…" : "Search TMDB"}</button>
      </form>
      {results.map(item => <button key={item.id} type="button" onClick={() => { setSelected(item); setSummary(null); }} className="surface-card" style={{ display: "flex", gap: 14, textAlign: "left", padding: 12, border: selected?.id === item.id ? "1px solid var(--accent)" : "1px solid var(--border)", cursor: "pointer" }}>
        {item.poster_url ? <img src={item.poster_url} alt="" width="64" height="92" style={{ objectFit: "cover", borderRadius: 8 }} /> : null}
        <span><strong>{item.title}</strong><br/><small style={{ color: "var(--muted)" }}>{item.release_date || "Release date unavailable"} · TMDB {item.id} · Rating {Number(item.rating ?? 0).toFixed(1)}</small><br/><small>{item.overview?.slice(0, 180)}</small></span>
      </button>)}
      {selected && <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <strong>Selected: {selected.title}</strong>
        <p style={{ color: "var(--muted)" }}>This imports available TMDB season and episode records. It does not import or create video links.</p>
        <button type="button" className="button button--primary" disabled={busy} onClick={() => void importSelected()}>{busy ? "Importing…" : "Import title + episodes"}</button>
      </div>}
      {notice && <p role="status" style={{ color: "var(--muted)" }}>{notice}</p>}
      {summary && <pre className="surface-card" style={{ padding: 14, whiteSpace: "pre-wrap" }}>{JSON.stringify(summary, null, 2)}</pre>}
    </div>
  </section>;
}
