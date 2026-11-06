"use client";

import { useCallback, useEffect, useState } from "react";

type Server = { id:string; name:string; hostname:string; enabled:boolean; protection_enabled:boolean; created_at:string; source_count:number };
export function StreamingServerManager({ initialItems }: { initialItems: Server[] }) {
  const [items,setItems] = useState(initialItems);
  const [name,setName] = useState("");
  const [hostname,setHostname] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/streaming-servers",{cache:"no-store"});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not refresh servers.");
    setItems(data.items ?? []);
  },[]);
  useEffect(()=>{ void refresh().catch(e=>{setError(true);setMessage(e instanceof Error?e.message:"Could not load servers.");}); },[refresh]);
  async function create(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/admin/streaming-servers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,hostname})});
      const data = await response.json(); if(!response.ok) throw new Error(data.error ?? "Could not add server.");
      setName("");setHostname("");await refresh();setMessage("Server added. You can now assign its hostname to episode playback links.");
    } catch(e) {setError(true);setMessage(e instanceof Error?e.message:"Could not add server.");}
    finally {setBusy(false);}
  }
  async function update(id:string, patch:Partial<Pick<Server,"enabled"|"protection_enabled">>) {
    setBusy(true);setMessage("");setError(false);
    try {
      const response=await fetch("/api/admin/streaming-servers",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,...patch})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not update server.");
      setItems(old=>old.map(item=>item.id===id?{...item,...data.item}:item));
      setMessage(patch.protection_enabled !== undefined ? `Playback protection ${patch.protection_enabled?"enabled":"disabled"} for this server.` : `Server ${patch.enabled?"enabled":"disabled"}.`);
    } catch(e) {setError(true);setMessage(e instanceof Error?e.message:"Could not update server.");}
    finally {setBusy(false);}
  }
  async function remove(server:Server) {
    if(!window.confirm(`Delete ${server.name}? This is only possible when no playback links use it.`))return;
    setBusy(true);setMessage("");setError(false);
    try {const response=await fetch("/api/admin/streaming-servers?id="+encodeURIComponent(server.id),{method:"DELETE"});const data=await response.json();if(!response.ok)throw new Error(data.error??"Delete failed.");setItems(old=>old.filter(item=>item.id!==server.id));setMessage("Server deleted.");}
    catch(e){setError(true);setMessage(e instanceof Error?e.message:"Delete failed.");}
    finally{setBusy(false);}
  }
  return <section className="page-container server-admin">
    <header className="server-admin__hero"><div><p className="eyebrow"><span className="eyebrow__dot"/> ANISTREAM / PLAYBACK INFRASTRUCTURE</p><h1>Streaming <span>servers.</span></h1><p>Register the embed domains used by your episodes, switch servers on or off, and control each server’s playback-protection setting.</p></div><div className="server-admin__summary"><strong>{items.length}</strong><span>REGISTERED<br/>SERVERS</span></div></header>
    <div className="server-admin__layout">
      <section className="server-panel"><div className="server-panel__heading"><div><span className="server-step">01 / ADD A SERVER</span><h2>Register playback host</h2><p>Use only the hostname of the embed provider.</p></div><span className="server-badge">NEW SERVER</span></div>
        <form className="server-form" onSubmit={create}><label>Server display name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Abyss Player" maxLength={80} required/></label><label>Allowed hostname<input value={hostname} onChange={e=>setHostname(e.target.value)} placeholder="e.g. player.example.com" required/><small>Do not include https://, a path, or a port.</small></label><button className="button button--primary" disabled={busy}>＋ Add server</button></form>
      </section>
      <section className="server-panel"><div className="server-panel__heading"><div><span className="server-step">02 / SERVER SETTINGS</span><h2>Your playback servers</h2><p>Each server has independent availability and protection controls.</p></div><span className="server-badge">{items.length} TOTAL</span></div>
        {items.length ? <div className="server-list">{items.map(server=><article className="server-card" key={server.id}><div className="server-card__identity"><span className="server-card__icon">▶</span><div><strong>{server.name}</strong><code>{server.hostname}</code><small>{server.source_count.toLocaleString("en-IN")} linked source{server.source_count===1?"":"s"}</small></div><span className={`server-status ${server.enabled?"is-on":"is-off"}`}>{server.enabled?"ACTIVE":"DISABLED"}</span></div><div className="server-card__controls"><label className="server-switch"><span><strong>Server availability</strong><small>Allow this host to be selected for playback links.</small></span><input type="checkbox" checked={server.enabled} disabled={busy} onChange={e=>void update(server.id,{enabled:e.target.checked})}/><i/></label><label className="server-switch"><span><strong>Playback protection</strong><small>{server.protection_enabled?"Protection setting is ON.":"Protection setting is OFF."}</small></span><input type="checkbox" checked={server.protection_enabled} disabled={busy} onChange={e=>void update(server.id,{protection_enabled:e.target.checked})}/><i/></label></div><div className="server-card__footer"><span>Created {new Date(server.created_at).toLocaleDateString("en-IN")}</span><button type="button" disabled={busy} onClick={()=>void remove(server)}>Delete server</button></div></article>)}</div>:<div className="server-empty"><span>＋</span><strong>No playback servers yet</strong><p>Add your first approved embed hostname above.</p></div>}
      </section>
    </div>
    {message&&<p className={`server-feedback ${error?"is-error":"is-success"}`} role="status">{message}</p>}
    <aside className="server-notice"><strong>How protection works</strong><p>The switch saves a per-server protection setting used by the player. HTTPS and approved-host validation remain active on every server. A dashboard switch cannot stop users from inspecting or sharing an external provider’s URL; anti-hotlink, token expiry and domain restrictions must also be supported by that provider.</p></aside>
  </section>;
}
