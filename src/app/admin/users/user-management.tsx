"use client";

import { useState } from "react";

type Item = { user_id:string; role:"super_admin"|"admin"; permissions:Record<string,boolean>; created_at:string };
const permissionOptions = [
  {key:"content.manage",label:"Content management",description:"Create, edit and publish titles."},
  {key:"links.import",label:"Episode links & imports",description:"Import links and manage import history."},
  {key:"streaming.manage",label:"Streaming servers",description:"Manage approved streaming server records."},
  {key:"downloads.manage",label:"Download providers",description:"Manage approved download providers."},
];
const emptyPermissions = Object.fromEntries(permissionOptions.map(item=>[item.key,false]));
export function UserManagement({initialItems,currentUserId}:{initialItems:Item[];currentUserId:string}) {
  const [items,setItems]=useState(initialItems);
  const [userId,setUserId]=useState("");
  const [permissions,setPermissions]=useState<Record<string,boolean>>({...emptyPermissions, "content.manage":true});
  const [editingId,setEditingId]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function send(method:"POST"|"PATCH"|"DELETE",body:Record<string,unknown>) {
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/admin/users",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error??"Request failed.");
      setMessage("Changes saved.");window.location.reload();
    } catch(error) {setMessage(error instanceof Error?error.message:"Something went wrong.");}
    finally {setBusy(false);}
  }
  return <div style={{display:"grid",gap:24,marginTop:28}}>
    <section className="surface-card" style={{padding:22}}>
      <p className="eyebrow">ADD ADMINISTRATOR</p><h2 style={{margin:"6px 0 8px"}}>Grant access to an account</h2>
      <p style={{color:"var(--muted)",fontSize:14}}>The person must have already signed in to AniStream at least once. Ask them for their account UUID; email addresses are not exposed by the current secure database policies.</p>
      <label className="catalog-field" style={{marginTop:16}}>Account UUID<input value={userId} onChange={e=>setUserId(e.target.value.trim())} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off"/></label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,marginTop:16}}>
        {permissionOptions.map(option=><label key={option.key} className="surface-card" style={{padding:14,display:"flex",gap:10,alignItems:"flex-start"}}><input type="checkbox" checked={!!permissions[option.key]} onChange={e=>setPermissions(old=>({...old,[option.key]:e.target.checked}))}/><span><strong>{option.label}</strong><small style={{display:"block",color:"var(--muted)",marginTop:4}}>{option.description}</small></span></label>)}
      </div>
      <button className="button button--primary" disabled={busy||!userId.trim()||!Object.values(permissions).some(Boolean)} onClick={()=>send(editingId?"PATCH":"POST",{userId,permissions})} style={{marginTop:18}}>{busy?"Saving…":editingId?"Save permission changes":"＋ Grant admin access"}</button>
    </section>
    <section><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><p className="eyebrow">ACCESS DIRECTORY</p><h2 style={{margin:"5px 0"}}>Administrator accounts</h2></div><span style={{color:"var(--muted)",fontSize:13}}>{items.length} memberships</span></div>
      <div className="surface-card" style={{marginTop:14,overflowX:"auto"}}>
        <table style={{width:"100%",minWidth:700,borderCollapse:"collapse",textAlign:"left"}}><thead><tr>{["Account UUID","Role","Permissions","Added","Actions"].map(label=><th key={label} style={{padding:13,borderBottom:"1px solid var(--line)",fontSize:12,color:"var(--muted)"}}>{label}</th>)}</tr></thead>
        <tbody>{items.map(item=><tr key={item.user_id}><td style={{padding:13,borderBottom:"1px solid var(--line)",fontSize:12,fontFamily:"monospace"}}>{item.user_id}{item.user_id===currentUserId?<small style={{display:"block",color:"var(--muted)"}}>You</small>:null}</td>
          <td style={{padding:13,borderBottom:"1px solid var(--line)"}}>{item.role==="super_admin"?"Super Admin":"Admin"}</td>
          <td style={{padding:13,borderBottom:"1px solid var(--line)",fontSize:12}}>{item.role==="super_admin"?"All permissions":permissionOptions.filter(option=>item.permissions[option.key]).map(option=>option.label).join(", ")||"No permissions"}</td>
          <td style={{padding:13,borderBottom:"1px solid var(--line)",fontSize:12}}>{new Date(item.created_at).toLocaleDateString("en-IN")}</td>
          <td style={{padding:13,borderBottom:"1px solid var(--line)"}}>{item.role==="admin"&&item.user_id!==currentUserId?<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="button button--quiet" disabled={busy} onClick={()=>{setEditingId(item.user_id);setUserId(item.user_id);setPermissions({...emptyPermissions,...item.permissions});window.scrollTo({top:0,behavior:"smooth"});}}>Edit permissions</button><button className="button button--quiet" disabled={busy} onClick={()=>{if(window.confirm("Revoke admin access for "+item.user_id+"?"))send("DELETE",{userId:item.user_id});}}>Revoke</button></div>:<span style={{color:"var(--muted)",fontSize:12}}>{item.role==="super_admin"?"Protected account":"—"}</span>}</td>
        </tr>)}</tbody></table>
      </div>
    </section>
    {message?<p role="status" style={{color:"var(--muted)"}}>{message}</p>:null}
    <p style={{color:"var(--muted)",fontSize:12}}>Super Admin membership cannot be created, edited or removed from this page. Only existing Super Admins can grant admin access.</p>
  </div>;
}
