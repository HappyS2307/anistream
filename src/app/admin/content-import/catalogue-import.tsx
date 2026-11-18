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
  const [bulkIds, setBulkIds] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState<Record<string, unknown> | null>(null);

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

  async function startBulkImport() {
    const ids = [...new Set(bulkIds.split(/[\\s,;]+/).map(value => value.trim()).filter(Boolean))];
    if (!ids.length || ids.length > 5000 || ids.some(value => !/^\\d+$/.test(value) || Number(value) < 1)) { setNotice("Enter 1–5000 valid TMDB numeric IDs, separated by commas or new lines."); return; }
    setBusy(true); setNotice("Creating bulk import job…");
    try {
      const response = await fetch("/api/admin/catalogue-import-jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, tmdb_ids: ids.map(Number) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not create bulk job.");
      setJobId(data.job_id); setJobStatus(data); setNotice(`Bulk job created with ${data.total_items} unique titles. Press Process job to begin.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Bulk job creation failed."); }
    finally { setBusy(false); }
  }

  async function processBulkJob() {
    if (!jobId) return; setBusy(true); setNotice("Processing catalogue import batches…");
    try {
      let status = "queued";
      while (status === "queued" || status === "processing") {
        const response = await fetch("/api/admin/catalogue-import-jobs/process", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ job_id: jobId }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Batch processing failed.");
        const check = await fetch(`/api/admin/catalogue-import-jobs?job_id=${jobId}`, { cache: "no-store" });
        const snapshot = await check.json(); if (!check.ok) throw new Error(snapshot.error ?? "Could not refresh job status.");
        setJobStatus(snapshot.job); status = String(snapshot.job.status);
        setNotice(`Bulk import: ${snapshot.job.processed_items}/${snapshot.job.total_items} processed · ${snapshot.job.imported_items} imported · ${snapshot.job.failed_items} failed.`);
        if (status === "processing" || status === "queued") await new Promise(resolve => setTimeout(resolve, 350));
      }
      setNotice(`Bulk job finished: ${status}. Review failed items and retry if needed.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Bulk processing stopped. You can resume the job."); }
    finally { setBusy(false); }
  }

  async function retryFailed() {
    if (!jobId) return; setBusy(true);
    try { const response = await fetch("/api/admin/catalogue-import-jobs/process", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ job_id: jobId, action: "retry_failed" }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Retry failed."); setNotice("Failed items queued again. Press Process job to resume."); setJobStatus({ status: "queued" }); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Retry failed."); } finally { setBusy(false); }
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
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8, display: "grid", gap: 10 }}>
        <h2 style={{ fontSize: 20 }}>Bulk catalogue import</h2>
        <p style={{ color: "var(--muted)" }}>Paste up to 5,000 TMDB IDs, separated by commas or new lines. Jobs process in small batches and can be resumed. All imported titles remain Draft.</p>
        <textarea className="form-control" rows={5} value={bulkIds} onChange={event => setBulkIds(event.target.value)} placeholder={"13916\\n42511\\n46260"} aria-label="TMDB IDs for bulk import" />
        <button type="button" className="button button--quiet" disabled={busy || !bulkIds.trim()} onClick={() => void startBulkImport()}>Create bulk job</button>
        {jobId && <div className="surface-card" style={{ padding: 14, display: "grid", gap: 8 }}>
          <small>Job: {jobId}</small><strong>Status: {String(jobStatus?.status ?? "queued")}</strong>
          <button type="button" className="button button--primary" disabled={busy} onClick={() => void processBulkJob()}>{busy ? "Processing…" : "Process / Resume job"}</button>
          <button type="button" className="button button--quiet" disabled={busy} onClick={() => void retryFailed()}>Retry failed items</button>
        </div>}
      </div>
      {notice && <p role="status" style={{ color: "var(--muted)" }}>{notice}</p>}
      {summary && <pre className="surface-card" style={{ padding: 14, whiteSpace: "pre-wrap" }}>{JSON.stringify(summary, null, 2)}</pre>}
    </div>
  </section>;
}
