"use client";
import {useState} from "react";
type Section={section_key:string;title:string;enabled:boolean;sort_order:number};
const labels:Record<string,string>={latest:"Recently added",anime:"Anime collection",drama:"Drama collection",web_series:"Web Series collection",movies:"Movies collection",discover_banner:"Discover banner"};
export function HomepageStudio({initialSections}:{initialSections:Section[]}){
 const [sections,setSections]=useState([...initialSections].sort((a,b)=>a.sort_order-b.sort_order));
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 function move(index:number,direction:-1|1){const next=[...sections];const target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];setSections(next.map((item,i)=>({...item,sort_order:i+1})));}
 async function save(){setBusy(true);setMessage("");try{const response=await fetch("/api/admin/homepage-sections",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({sections:sections.map((item,index)=>({...item,sort_order:index+1}))})});const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not save settings.");setMessage("Homepage settings saved.");}catch(error){setMessage(error instanceof Error?error.message:"Something went wrong.");}finally{setBusy(false);}}
 return <div style={{display:"grid",gap:14,marginTop:28}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><p className="eyebrow">HOMEPAGE SECTIONS</p><h2 style={{margin:"4px 0"}}>Display layout</h2></div><button className="button button--primary" onClick={save} disabled={busy}>{busy?"Saving…":"Save homepage layout"}</button></div>
  {sections.map((item,index)=><section key={item.section_key} className="surface-card" style={{padding:18,display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:16,alignItems:"center"}}>
   <div><p className="eyebrow" style={{marginBottom:8}}>SECTION {String(index+1).padStart(2,"0")} · {labels[item.section_key]}</p><label className="catalog-field">Display title<input maxLength={80} value={item.title} onChange={e=>setSections(old=>old.map(row=>row.section_key===item.section_key?{...row,title:e.target.value}:row))}/></label><label style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:12,fontSize:14}}><input type="checkbox" checked={item.enabled} onChange={e=>setSections(old=>old.map(row=>row.section_key===item.section_key?{...row,enabled:e.target.checked}:row))}/> Show on homepage</label></div>
   <div style={{display:"grid",gap:8}}><button className="button button--quiet" disabled={index===0} onClick={()=>move(index,-1)} aria-label={"Move "+item.title+" up"}>↑</button><button className="button button--quiet" disabled={index===sections.length-1} onClick={()=>move(index,1)} aria-label={"Move "+item.title+" down"}>↓</button></div>
  </section>)}
  <div style={{display:"flex",justifyContent:"flex-end"}}><button className="button button--primary" onClick={save} disabled={busy}>{busy?"Saving…":"Save changes"}</button></div>
  {message?<p role="status" style={{color:"var(--muted)"}}>{message}</p>:null}
 </div>;
}