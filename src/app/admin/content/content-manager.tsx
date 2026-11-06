"use client";

import { useCallback, useEffect, useState } from "react";

type Item = { id:string; slug:string; kind:"anime"|"drama"|"web_series"|"movie"; title:string; publication_status:"draft"|"published"|"archived"; created_at:string; poster_url:string|null; release_year:number|null; synopsis:string|null; banner_url:string|null; rating:number|null; genres:string[]; tags:string[]; original_title:string|null; trailer_url:string|null };
type Cursor = { created_at:string; id:string } | null;
type Draft = { id?:string; slug:string; kind:Item["kind"]; title:string; synopsis:string; poster_url:string; banner_url:string; release_year:string; rating:string; publication_status:Item["publication_status"]; genres:string; tags:string; original_title:string; trailer_url:string };
const empty:Draft={slug:"",kind:"anime",title:"",synopsis:"",poster_url:"",banner_url:"",release_year:"",rating:"",publication_status:"draft",genres:"",tags:"",original_title:"",trailer_url:""};

export function ContentManager() {
  const [items,setItems]=useState<Item[]>([]);
  const [cursor,setCursor]=useState<Cursor>(null);
  const [next,setNext]=useState<Cursor>(null);
  const [query,setQuery]=useState("");
  const [draft,setDraft]=useState<Draft>(empty);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");


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

  function edit(item:Item){
    setDraft({id:item.id,slug:item.slug,kind:item.kind,title:item.title,synopsis:item.synopsis??"",poster_url:item.poster_url??"",banner_url:item.banner_url??"",release_year:item.release_year?.toString()??"",rating:item.rating?.toString()??"",publication_status:item.publication_status,genres:(item.genres??[]).join("|"),tags:(item.tags??[]).join("|"),original_title:item.original_title??"",trailer_url:item.trailer_url??""});
    setMessage("Editing basic fields. Saving changes only fields entered below; blank optional fields are cleared.");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  async function save(){
    setBusy(true);setMessage("");
    const payload:Record<string,unknown>={slug:draft.slug,kind:draft.kind,title:draft.title,synopsis:draft.synopsis||null,poster_url:draft.poster_url||null,banner_url:draft.banner_url||null,release_year:draft.release_year?Number(draft.release_year):null,rating:draft.rating?Number(draft.rating):null,publication_status:draft.publication_status,genres:draft.genres.split("|").map(x=>x.trim()).filter(Boolean),tags:draft.tags.split("|").map(x=>x.trim()).filter(Boolean),original_title:draft.original_title||null,trailer_url:draft.trailer_url||null};
    try{
      const response=await fetch("/api/admin/content",{method:draft.id?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(draft.id?{id:draft.id,...payload}:payload)});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error??"Save failed.");
      setDraft(empty);setMessage(draft.id?"Title updated.":"Title created.");setCursor(null);setNext(null);setItems([]);void load(true);
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
  const field=(label:keyof Draft,title:string,type="text")=><label style={{display:"grid",gap:6,fontSize:13,color:"var(--muted)"}}>{title}<input className="form-control" type={type} value={draft[label] as string} onChange={e=>setDraft(v=>({...v,[label]:e.target.value}))}/></label>;

  return <section className="page-container" style={{paddingBlock:"40px 80px"}}>
    <p className="eyebrow">ANISTREAM / CONTROL CENTRE</p><h1 style={{fontSize:"clamp(2rem,5vw,3rem)",letterSpacing:"-.05em"}}>Content catalogue</h1>
    <p style={{color:"var(--muted)"}}>Manually create and manage titles. The 40-item page size is only a browsing window, not a catalogue limit.</p>
    <div className="surface-card" style={{padding:22,marginTop:24}}>
      <h2 style={{fontSize:20,marginTop:0}}>{draft.id?"Edit title":"Add a title"}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14}}>
        {field("title","Title")}{field("slug","Slug")}
        <label style={{display:"grid",gap:6,fontSize:13,color:"var(--muted)"}}>Category<select className="form-control" value={draft.kind} onChange={e=>setDraft(v=>({...v,kind:e.target.value as Draft["kind"]}))}><option value="anime">Anime</option><option value="drama">Drama</option><option value="web_series">Web Series</option><option value="movie">Movie</option></select></label>
        <label style={{display:"grid",gap:6,fontSize:13,color:"var(--muted)"}}>Publication status<select className="form-control" value={draft.publication_status} onChange={e=>setDraft(v=>({...v,publication_status:e.target.value as Draft["publication_status"]}))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        {field("original_title","Original title")}{field("release_year","Release year","number")}{field("rating","Rating / 10","number")}{field("poster_url","Poster URL")}{field("banner_url","Banner URL")}{field("trailer_url","Trailer URL")}{field("genres","Genres (separate with |)")}{field("tags","Tags (separate with |)")}
      </div>
      <label style={{display:"grid",gap:6,fontSize:13,color:"var(--muted)",marginTop:14}}>Synopsis<textarea className="form-control" rows={4} value={draft.synopsis} onChange={e=>setDraft(v=>({...v,synopsis:e.target.value}))}/></label>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:16}}><button className="button button--primary" disabled={busy} onClick={()=>void save()}>{busy?"Saving…":draft.id?"Save changes":"Create title"}</button>{draft.id&&<button className="button button--quiet" onClick={()=>setDraft(empty)}>Cancel edit</button>}</div>
    </div>
    <div style={{display:"flex",gap:10,marginTop:36,flexWrap:"wrap"}}><input className="form-control" aria-label="Search catalogue" placeholder="Search title or slug" value={query} onChange={e=>setQuery(e.target.value)} style={{maxWidth:420}}/><button className="button button--quiet" disabled={busy} onClick={()=>{setCursor(null);setNext(null);setItems([]);void load(true);}}>Search</button><button className="button button--quiet" disabled={busy} onClick={()=>{setQuery("");setCursor(null);setItems([]);}}>Reset</button></div>
    {message&&<p role="status" style={{padding:12,border:"1px solid var(--line)",marginTop:14}}>{message}</p>}
    <div style={{display:"grid",gap:10,marginTop:16}}>
      {items.map(item=><article className="surface-card" key={item.id} style={{padding:14,display:"flex",gap:14,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div><strong>{item.title}</strong><p style={{margin:"4px 0 0",fontSize:13,color:"var(--muted)"}}>{item.kind} · {item.slug} · {item.publication_status}</p></div>
        <div style={{display:"flex",gap:8}}><button className="button button--quiet" onClick={()=>edit(item)}>Edit</button><button className="button button--quiet" disabled={busy} onClick={()=>void remove(item.id)}>Delete</button></div>
      </article>)}
      {!items.length&&!busy&&<p style={{color:"var(--muted)"}}>No titles found.</p>}
    </div>
    {next&&<button className="button button--quiet" disabled={busy} onClick={()=>void load(false,cursor)} style={{marginTop:20}}>{busy?"Loading…":"Load more titles"}</button>}
  </section>;
}
