"use client";

import { useCallback, useEffect, useState } from "react";

type Kind = "anime" | "drama" | "web_series" | "movie";
type Item = { id:string; slug:string; kind:Kind; title:string; publication_status:"draft"|"published"|"archived"; created_at:string; poster_url:string|null; release_year:number|null; synopsis:string|null; banner_url:string|null; rating:number|null; genres:string[]; tags:string[]; original_title:string|null; trailer_url:string|null };
type Cursor = { created_at:string; id:string } | null;
type Draft = { id?:string; slug:string; kind:Kind; title:string; synopsis:string; poster_url:string; banner_url:string; release_year:string; rating:string; publication_status:Item["publication_status"]; genres:string; tags:string; original_title:string; trailer_url:string };
type TMDBResult = {id:number;title:string;original_title:string;overview:string;poster_url:string;release_date:string;rating:number;media_type:string};
type TMDBDetails = Partial<Draft> & {tmdb_id:number; release_date?:string|null;end_date?:string|null;content_status?:string|null;runtime_minutes?:number|null;total_episodes?:number|null;studios?:string[];country_codes?:string[];language_codes?:string[];seasons?:{season_number:number;title:string;episode_count:number;air_date:string}[];tmdb_url?:string};
const empty:Draft={slug:"",kind:"anime",title:"",synopsis:"",poster_url:"",banner_url:"",release_year:"",rating:"",publication_status:"draft",genres:"",tags:"",original_title:"",trailer_url:""};
const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export function ContentManager() {
  const [items,setItems]=useState<Item[]>([]);
  const [cursor,setCursor]=useState<Cursor>(null);
  const [next,setNext]=useState<Cursor>(null);
  const [query,setQuery]=useState("");
  const [draft,setDraft]=useState<Draft>(empty);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [tmdbQuery,setTmdbQuery]=useState("");
  const [tmdbResults,setTmdbResults]=useState<TMDBResult[]>([]);
  const [tmdbBusy,setTmdbBusy]=useState(false);
  const [tmdbMessage,setTmdbMessage]=useState("");
  const [selectedTmdb,setSelectedTmdb]=useState<TMDBDetails|null>(null);
  const [showAdvanced,setShowAdvanced]=useState(false);

  const load=useCallback(async(reset:boolean, fromCursor:Cursor = null) => {
    setBusy(true);
    try {
      const params=new URLSearchParams();
      if(query.trim()) params.set("q",query.trim());
      const activeCursor=reset?null:fromCursor;
      if(activeCursor){params.set("created_at",activeCursor.created_at);params.set("id",activeCursor.id);}
      const response=await fetch("/api/admin/content?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error??"Catalogue request failed.");
      setItems(old=>reset?data.items:[...old,...data.items]);
      setNext(data.nextCursor??null);
      setCursor(data.nextCursor??null);
    } catch(e){setMessage(e instanceof Error?e.message:"Unable to load catalogue.");}
    finally{setBusy(false);}
  },[query]);
  useEffect(()=>{void load(true);},[load]);

  async function searchTMDB(){
    if(!tmdbQuery.trim())return;
    setTmdbBusy(true);setTmdbMessage("");setTmdbResults([]);setSelectedTmdb(null);
    try{
      const params=new URLSearchParams({q:tmdbQuery.trim(),kind:draft.kind});
      const response=await fetch("/api/admin/tmdb?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"TMDB search failed.");
      setTmdbResults(data.results??[]);
      if(!(data.results??[]).length)setTmdbMessage("No matching titles found. Try the original or English title.");
    }catch(e){setTmdbMessage(e instanceof Error?e.message:"TMDB lookup failed.");}
    finally{setTmdbBusy(false);}
  }

  async function chooseTMDB(result:TMDBResult){
    setTmdbBusy(true);setTmdbMessage("");
    try{
      const params=new URLSearchParams({id:String(result.id),kind:draft.kind});
      const response=await fetch("/api/admin/tmdb?"+params.toString(),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error??"Could not load title details.");
      const detail=data.item as TMDBDetails;
      setSelectedTmdb(detail);
      setDraft(old=>({...old,title:detail.title??result.title,slug:old.slug||slugify(detail.title??result.title),original_title:detail.original_title??result.original_title??"",synopsis:detail.synopsis??"",poster_url:detail.poster_url??"",banner_url:detail.banner_url??"",release_year:String(detail.release_year??""),rating:String(detail.rating??""),genres:(detail.genres??[]).join("|"),trailer_url:detail.trailer_url??"",tags:old.tags}));
      setTmdbResults([]);
      setTmdbMessage("Metadata imported. Review the fields, then create the title. Season and episode links are added separately.");
      setShowAdvanced(true);
    }catch(e){setTmdbMessage(e instanceof Error?e.message:"TMDB details lookup failed.");}
    finally{setTmdbBusy(false);}
  }

  function edit(item:Item){
    setDraft({id:item.id,slug:item.slug,kind:item.kind,title:item.title,synopsis:item.synopsis??"",poster_url:item.poster_url??"",banner_url:item.banner_url??"",release_year:item.release_year?.toString()??"",rating:item.rating?.toString()??"",publication_status:item.publication_status,genres:(item.genres??[]).join("|"),tags:(item.tags??[]).join("|"),original_title:item.original_title??"",trailer_url:item.trailer_url??""});
    setSelectedTmdb(null);setMessage("Editing catalogue entry.");window.scrollTo({top:0,behavior:"smooth"});
  }
  async function save(){
    if(!draft.title.trim()||!draft.slug.trim()){setMessage("Title and slug are required.");return;}
    setBusy(true);setMessage("");
    const payload:Record<string,unknown>={slug:draft.slug,kind:draft.kind,title:draft.title,synopsis:draft.synopsis||null,poster_url:draft.poster_url||null,banner_url:draft.banner_url||null,release_year:draft.release_year?Number(draft.release_year):null,rating:draft.rating?Number(draft.rating):null,publication_status:draft.publication_status,genres:draft.genres.split("|").map(x=>x.trim()).filter(Boolean),tags:draft.tags.split("|").map(x=>x.trim()).filter(Boolean),original_title:draft.original_title||null,trailer_url:draft.trailer_url||null};
    try{
      const response=await fetch("/api/admin/content",{method:draft.id?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(draft.id?{id:draft.id,...payload}:payload)});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Save failed.");
      setDraft(empty);setSelectedTmdb(null);setTmdbQuery("");setTmdbMessage("");setMessage(draft.id?"Title updated.":"Title created. Now add its seasons, episodes and playback links.");setCursor(null);setNext(null);setItems([]);void load(true);
    }catch(e){setMessage(e instanceof Error?e.message:"Save failed.");}
    finally{setBusy(false);}
  }
  async function remove(id:string){
    if(!window.confirm("Delete this title? Related seasons, episodes or sources may prevent deletion."))return;
    setBusy(true);
    try{const response=await fetch("/api/admin/content?id="+encodeURIComponent(id),{method:"DELETE"});const data=await response.json();if(!response.ok)throw new Error(data.error??"Delete failed.");setItems(old=>old.filter(x=>x.id!==id));setMessage("Title deleted.");}
    catch(e){setMessage(e instanceof Error?e.message:"Delete failed.");}
    finally{setBusy(false);}
  }
  const field=(label:keyof Draft,title:string,type="text",hint?:string)=><label className="catalog-field">{title}<input className="form-control" type={type} value={draft[label] as string} placeholder={hint??""} onChange={e=>setDraft(v=>({...v,[label]:e.target.value}))}/></label>;

  return <section className="page-container catalogue-admin">
    <div className="catalogue-admin__top"><div><p className="eyebrow"><span className="eyebrow__dot"/> ANISTREAM / CONTENT STUDIO</p><h1>Build your <span>catalogue.</span></h1><p className="catalogue-admin__intro">Find a title on TMDB, import its metadata, then add your seasons, episodes and playback links.</p></div><div className="catalogue-admin__counter"><strong>01</strong><span>CONTENT<br/>WORKSPACE</span></div></div>

    <div className="catalogue-admin__layout">
      <div className="catalogue-admin__main">
        <section className="catalogue-panel">
          <div className="catalogue-panel__heading"><div><span className="catalogue-step">STEP 01</span><h2>Find title details</h2><p>Search TMDB and autofill the title information.</p></div><span className="catalogue-panel__badge">TMDB CONNECT</span></div>
          <div className="tmdb-search">
            <label className="catalog-field">Content type<select className="form-control" value={draft.kind} onChange={e=>{setDraft(v=>({...v,kind:e.target.value as Kind}));setTmdbResults([]);setSelectedTmdb(null);}}><option value="anime">Anime / Animation</option><option value="drama">Drama / TV</option><option value="web_series">Web Series</option><option value="movie">Movie</option></select></label>
            <label className="catalog-field tmdb-search__query">Search title<input className="form-control" value={tmdbQuery} onChange={e=>setTmdbQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();void searchTMDB();}}} placeholder="e.g. Solo Leveling, One Piece…"/></label>
            <button className="button button--primary tmdb-search__button" disabled={tmdbBusy||!tmdbQuery.trim()} onClick={()=>void searchTMDB()}>{tmdbBusy?"Searching…":"Search TMDB ↗"}</button>
          </div>
          {tmdbMessage&&<p className="catalogue-feedback" role="status">{tmdbMessage}</p>}
          {tmdbResults.length>0&&<div className="tmdb-results" aria-label="TMDB search results">{tmdbResults.map(result=><button className="tmdb-result" key={result.id} onClick={()=>void chooseTMDB(result)} disabled={tmdbBusy}><span className="tmdb-result__poster">{result.poster_url?<img src={result.poster_url} alt=""/>:<span>AS</span>}</span><span className="tmdb-result__copy"><strong>{result.title}</strong><small>{result.original_title} · {(result.release_date??"").slice(0,4)||"Year unknown"}</small><small>TMDB ★ {Number(result.rating??0).toFixed(1)}</small></span><span className="tmdb-result__select">Import ↗</span></button>)}</div>}
          {selectedTmdb&&<div className="tmdb-selected"><span>✓</span> Metadata selected · <a href={selectedTmdb.tmdb_url} target="_blank" rel="noreferrer">View TMDB record ↗</a></div>}
        </section>

        <section className="catalogue-panel catalogue-panel--form">
          <div className="catalogue-panel__heading"><div><span className="catalogue-step">STEP 02</span><h2>{draft.id?"Edit title information":"Review imported information"}</h2><p>Check the details before saving to your catalogue.</p></div><span className="catalogue-panel__badge">MANUAL REVIEW</span></div>
          <div className="catalogue-form">
            {field("title","Display title","text","Title")}
            {field("slug","URL slug","text","auto-generated-from-title")}
            {field("original_title","Original title","text","Original language title")}
            {field("release_year","Release year","number","YYYY")}
            {field("rating","TMDB rating / 10","number","0.0")}
            <label className="catalog-field">Publication status<select className="form-control" value={draft.publication_status} onChange={e=>setDraft(v=>({...v,publication_status:e.target.value as Draft["publication_status"]}))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
            {field("poster_url","Poster image URL","url","https://…")}
            {field("banner_url","Backdrop image URL","url","https://…")}
            {field("trailer_url","Trailer URL","url","https://youtube.com/…")}
            {field("genres","Genres · separated by |","text","Action | Fantasy | Drama")}
          </div>
          <label className="catalog-field catalogue-form__wide">Synopsis<textarea className="form-control" rows={4} value={draft.synopsis} placeholder="Synopsis is filled from TMDB when available…" onChange={e=>setDraft(v=>({...v,synopsis:e.target.value}))}/></label>
          <label className="catalog-field catalogue-form__wide">Tags · separated by |<input className="form-control" value={draft.tags} placeholder="Hindi Dub | Subtitles | Featured" onChange={e=>setDraft(v=>({...v,tags:e.target.value}))}/></label>
          <button className="catalogue-advanced-toggle" onClick={()=>setShowAdvanced(v=>!v)} aria-expanded={showAdvanced}>{showAdvanced?"Hide":"Show"} additional metadata <span>{showAdvanced?"−":"＋"}</span></button>
          {showAdvanced&&<div className="catalogue-extra"><p>TMDB metadata is used to prefill the available fields. You can add extra details later in the advanced editor.</p>{selectedTmdb?.seasons?.length?<div className="catalogue-season-preview"><strong>{selectedTmdb.seasons.length} seasons detected</strong>{selectedTmdb.seasons.map(s=><span key={s.season_number}>Season {s.season_number} · {s.episode_count} episodes</span>)}</div>:null}<p className="catalogue-hint">Season structures and episode links are not created automatically yet. They will be managed separately so you can attach your own streaming URLs.</p></div>}
          <div className="catalogue-form__actions"><button className="button button--primary" disabled={busy} onClick={()=>void save()}>{busy?"Saving…":draft.id?"Save changes":"Create catalogue title"} <span>↗</span></button>{draft.id&&<button className="button button--quiet" onClick={()=>{setDraft(empty);setSelectedTmdb(null);}}>Cancel edit</button>}</div>
          {message&&<p className="catalogue-feedback" role="status">{message}</p>}
        </section>
      </div>

      <aside className="catalogue-sidebar"><div className="catalogue-sidecard"><span className="catalogue-step">YOUR WORKFLOW</span><h3>Metadata first.<br/>Playback next.</h3><ol><li><span>1</span><div><strong>Find on TMDB</strong><small>Import poster, synopsis, rating and release details.</small></div></li><li><span>2</span><div><strong>Review & create</strong><small>Confirm the title and save it as draft or published.</small></div></li><li><span>3</span><div><strong>Add seasons & episodes</strong><small>Set episode order and your own embed links.</small></div></li></ol><div className="catalogue-sidecard__note">TMDB provides metadata, not streaming video or episode embed URLs.</div></div></aside>
    </div>

    <section className="catalogue-library"><div className="catalogue-library__heading"><div><span className="catalogue-step">YOUR DATABASE</span><h2>Catalogue library</h2><p>The page window is 40 titles. Your total catalogue can grow beyond this.</p></div><span className="catalogue-library__count">{items.length}{next?"+":""} LOADED</span></div>
      <div className="catalogue-library__search"><input className="form-control" aria-label="Search catalogue" placeholder="Search title or slug…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void load(true);}}/><button className="button button--quiet" disabled={busy} onClick={()=>void load(true)}>Search ↗</button><button className="button button--quiet" disabled={busy} onClick={()=>{setQuery("");setItems([]);void load(true);}}>Reset</button></div>
      {items.length?<div className="catalogue-library__list">{items.map(item=><article className="catalogue-item" key={item.id}><div className="catalogue-item__poster">{item.poster_url?<img src={item.poster_url} alt=""/>:<span>AS</span>}</div><div className="catalogue-item__copy"><strong>{item.title}</strong><small>{item.kind.replace("_"," ")} · {item.release_year??"Year n/a"} · {item.slug}</small></div><span className={"catalogue-item__status catalogue-item__status--"+item.publication_status}>{item.publication_status}</span><button className="button button--quiet" onClick={()=>edit(item)}>Edit</button><button className="catalogue-item__delete" disabled={busy} onClick={()=>void remove(item.id)} aria-label={"Delete "+item.title}>×</button></article>)}</div>:<div className="catalogue-library__empty"><span>✳</span><strong>{busy?"Loading catalogue…":"Your catalogue starts here."}</strong><p>{busy?"":"Search TMDB above or add your first title to begin."}</p></div>}
      {next&&<button className="button button--quiet catalogue-load-more" disabled={busy} onClick={()=>void load(false,cursor)}>{busy?"Loading…":"Load more titles ↓"}</button>}
    </section>
  </section>;
}
