"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";

type ScheduleItem = { id: number; title: string; overview: string; poster_url: string; first_air_date: string | null; rating: number; tmdb_url: string };
export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/schedule", { cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Schedule unavailable."); return data; })
      .then(data => { if (active) setItems(data.items ?? []); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Schedule unavailable."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  return <SiteFrame><main className="page-container" style={{ paddingBlock: "42px 90px" }}>
    <p className="eyebrow">ANISTREAM / DISCOVERY</p>
    <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", letterSpacing: "-.05em" }}>Upcoming <span>anime.</span></h1>
    <p style={{ color: "var(--muted)", maxWidth: 650 }}>A release-date view of upcoming Japanese animation, powered by TMDB. Dates can change; check the linked listing for the latest confirmation.</p>
    <div style={{ display: "flex", gap: 10, marginBlock: 24 }}><Link className="button button--quiet" href="/explore">Explore library</Link><a className="button button--quiet" href="/api/schedule">Schedule data</a></div>
    {busy ? <p role="status">Loading upcoming anime…</p> : error ? <p role="alert">{error}</p> : items.length ? <div className="content-row__grid home-poster-rail">
      {items.map(item => <article className="poster-card" key={item.id}>
        <a className="poster-card__link" href={item.tmdb_url} target="_blank" rel="noreferrer">
          <div className="poster-card__artwork">{item.poster_url ? <Image src={item.poster_url} alt={`Poster for ${item.title}`} fill sizes="(max-width: 720px) 42vw, 16vw" unoptimized /> : <div className="surface-card" />}</div>
          <div className="poster-card__copy"><p className="poster-card__category">{item.first_air_date ? new Date(`${item.first_air_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date TBA"}</p><h3>{item.title}</h3><p className="poster-card__description">{item.overview || "Synopsis not available."}</p></div>
        </a>
      </article>)}
    </div> : <p>No upcoming anime release dates are listed right now.</p>}
  </main></SiteFrame>;
}
