"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";

type C={id:string;slug:string;title:string;kind:string};
type S={id:string;content_id:string;season_number:number;title:string|null};
type E={id:string;season_id:string;episode_number:number;title:string;synopsis:string|null};

export function SeasonEpisodeManager({contents}:{contents:C[]}){
 const [query,setQuery]=useState("");
 const [searchResults,setSearchResults]=useState<C[]>(contents);
 const [searchPage,setSearchPage]=useState(0);
 const [searchHasMore,setSearchHasMore]=useState(false);
 const [searchBusy,setSearchBusy]=useState(false);
 const [slug,setSlug]=useState("");
 const [seasons,setSeasons]=useState<S[]>([]);
 const [episodes,setEpisodes]=useState<E[]>([]);
 const [seasonId,setSeasonId]=useState("");
 const [seasonNo,setSeasonNo]=useState("1");
 const [seasonTitle,setSeasonTitle]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState(false);

 const selected=searchResults.find(x=>x.slug===slug)||contents.find(x=>x.slug===slug);
 const current=seasons.find(x=>x.id===seasonId);
 const visible=useMemo(()=>episodes.filter(x=>x.season_id===seasonId).sort((a,b)=>a.episode_number-b.episode_number),[episodes,seasonId]);
 const filtered=searchResults;
 async function searchTitles(append=false){
  setSearchBusy(true);setError(false);setMessage("");
  const page=append?searchPage+1:0;
  try{
   const r=await fetch("/api/admin/content-search?"+new URLSearchParams({q:query.trim(),page:String(page)}),{cache:"no-store"});
   const d=await r.json();if(!r.ok)throw Error(d.error||"Could not search titles");
   const found=(d.items||[]) as C[];
   setSearchResults(old=>append?[...old,...found.filter(x=>!old.some(y=>y.id===x.id))]:found);
   setSearchPage(page);setSearchHasMore(Boolean(d.hasMore));
   if(!append&&!found.some(x=>x.slug===slug))setSlug(found[0]?.slug||"");
   if(!found.length&&!append)setMessage("No matching titles. Try another search.");
  }catch(e){setError(true);setMessage(e instanceof Error?e.message:"Search failed");}
  finally{setSearchBusy(false);}
 }

 async function load(value=slug){
  if(!value){setSeasons([]);setEpisodes([]);setSeasonId("");return;}
  setBusy(true);
  try{
   const r=await fetch("/api/admin/seasons?slug="+encodeURIComponent(value),{cache:"no-store"});
   const d=await r.json();if(!r.ok)throw Error(d.error||"Could not load seasons");
   setSeasons(d.seasons||[]);setEpisodes(d.episodes||[]);
   setSeasonId(d.seasons?.[0]?.id||"");
   setSeasonNo(String(Math.max(0,...(d.seasons||[]).map((s:S)=>s.season_number))+1));
  }catch(e){setError(true);setMessage(e instanceof Error?e.message:"Load failed");}
  finally{setBusy(false);}
 }
 useEffect(()=>{void load();},[slug]);
 useEffect(()=>{if(!query.trim())return;const timer=window.setTimeout(()=>{void searchTitles(false);},180);return()=>window.clearTimeout(timer);},[query]);

 async function request(body:Record<string,unknown>){
  const r=await fetch("/api/admin/seasons",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();if(!r.ok)throw Error(d.error||"Could not save");return d;
 }
 async function createSeason(e:React.FormEvent){
  e.preventDefault();if(!selected)return;
  setBusy(true);setError(false);setMessage("");
  try{
   const created=await request({action:"create_season",content_id:selected.id,season_number:Number(seasonNo),title:seasonTitle.trim()||"Season "+seasonNo});
   const sid=created.item.id;
   setMessage("Season created. Paste the episode links in Bulk Link Import; AniStream will create one episode for each valid link.");
   await load();setSeasonId(sid);setSeasonNo(String(Number(seasonNo)+1));setSeasonTitle("");
  }catch(e){setError(true);setMessage(e instanceof Error?e.message:"Could not create season");}
  finally{setBusy(false);}
 }
 async function rename(ep:E){
  const title=window.prompt("Episode title",ep.title);if(title===null||!title.trim())return;
  setBusy(true);
  try{const r=await fetch("/api/admin/seasons",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({record_type:"episode",id:ep.id,title:title.trim()})});const d=await r.json();if(!r.ok)throw Error(d.error||"Could not rename");await load();}
  catch(e){setError(true);setMessage(e instanceof Error?e.message:"Rename failed");}
  finally{setBusy(false);}
 }
 async function remove(id:string,type:"season"|"episode"){
  if(!window.confirm("Delete this "+type+"?"))return;
  setBusy(true);
  try{const r=await fetch("/api/admin/seasons?id="+encodeURIComponent(id)+"&type="+type,{method:"DELETE"});const d=await r.json();if(!r.ok)throw Error(d.error||"Could not delete");await load();}
  catch(e){setError(true);setMessage(e instanceof Error?e.message:"Delete failed");}
  finally{setBusy(false);}
 }

 return <section className="page-container season-admin season-admin--simple">
  <header className="season-admin__hero"><div><p className="eyebrow">ANISTREAM / CONTENT MANAGER</p><h1>Seasons & <span>episodes</span></h1><p>Select a title, create a season, then paste episode links. Episodes are created automatically.</p></div><div className="season-admin__count"><strong>{seasons.length}</strong><small>SEASONS</small><strong>{episodes.length}</strong><small>EPISODES</small></div></header>

  <section className="season-panel">
   <span className="season-step">STEP 1 · CHOOSE A TITLE</span><h2>Which title do you want to manage?</h2>
   <input className="form-control season-title-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type a title name to search…" aria-label="Search titles"/>{searchBusy&&<small className="season-search-status">Searching catalogue…</small>}
   <select className="form-control" value={slug} onChange={e=>setSlug(e.target.value)}><option value="">Choose a title…</option>{filtered.map(c=><option key={c.id} value={c.slug}>{c.title} · {c.kind.replace("_"," ")}</option>)}</select>
   {selected&&<p className="season-selected-title">Managing: <strong>{selected.title}</strong> · {seasons.length} seasons · {episodes.length} episodes</p>}
  </section>

  {selected&&<>
   <section className="season-panel">
    <span className="season-step">STEP 2 · CREATE A SEASON</span><h2>Add a season</h2><p className="season-help">Create the season first. Episode records are created automatically when you import their streaming links.</p>
    <form className="season-quick-form" onSubmit={createSeason}>
     <label>Season number<input className="form-control" type="number" min="1" max="500" value={seasonNo} onChange={e=>setSeasonNo(e.target.value)} required/></label>
     <label>Season name <small>Optional</small><input className="form-control" value={seasonTitle} onChange={e=>setSeasonTitle(e.target.value)} placeholder={"Season "+seasonNo}/></label>
     <button className="button button--primary" disabled={busy}>＋ Create season</button>
    </form>
   </section>

   <section className="season-panel">
    <div className="season-list-heading"><div><span className="season-step">STEP 3 · SELECT A SEASON</span><h2>Your seasons</h2></div><span className="season-total">{seasons.length} total</span></div>
    {seasons.length===0?<p className="season-empty">No seasons yet. Create the first season above.</p>:<div className="season-card-list">{seasons.map(s=><article className={"season-card "+(seasonId===s.id?"is-selected":"")} key={s.id}><button type="button" className="season-card__select" onClick={()=>setSeasonId(s.id)}><span className="season-card__number">S{s.season_number}</span><span><strong>{s.title||"Season "+s.season_number}</strong><small>{episodes.filter(ep=>ep.season_id===s.id).length} episodes</small></span><span className="season-card__arrow">{seasonId===s.id?"●":"›"}</span></button><button type="button" className="season-delete" disabled={busy} onClick={()=>void remove(s.id,"season")}>Delete</button></article>)}</div>}
   </section>

   {current&&<section className="season-panel season-panel--episodes">
    <div className="season-list-heading"><div><span className="season-step">STEP 4 · EPISODE LINKS</span><h2>{current.title||"Season "+current.season_number}</h2><p className="season-help">Paste your episode URLs in order. AniStream creates the episode records automatically and attaches each link.</p></div><span className="season-total">{visible.length} episodes</span></div>
    <Link className="button button--primary season-import-cta" href={"/admin/import?content="+encodeURIComponent(slug)+"&season="+encodeURIComponent(String(current.season_number))}>＋ Add episode links</Link>
    <div className="season-episode-list">{visible.map(ep=><article key={ep.id}><b>{String(ep.episode_number).padStart(2,"0")}</b><div><strong>{ep.title}</strong><small>Episode {ep.episode_number}</small></div><button type="button" onClick={()=>void rename(ep)} disabled={busy}>Edit title</button><button type="button" className="season-delete" onClick={()=>void remove(ep.id,"episode")} disabled={busy}>Delete</button></article>)}</div>
    {!visible.length&&<p className="season-empty">No episodes yet. Add your episode links to create them automatically.</p>}
   </section>}
  </>}
  {message&&<p className={"season-feedback "+(error?"is-error":"is-success")} role="status">{message}</p>}
  <aside className="season-safety"><strong>Playback protection is unchanged</strong><p>This workspace only manages season and episode records. Existing player code, playback protection, embed validation and security checks are outside this feature and remain untouched.</p></aside>
 </section>;
}
