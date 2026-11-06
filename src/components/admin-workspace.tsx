"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import type {ReactNode} from "react";

const groups=[
 {label:"WORKSPACE",items:[
  {label:"Overview",href:"/admin",icon:"▦",hint:"Dashboard"},
 ]},
 {label:"CONTENT",items:[
  {label:"Content library",href:"/admin/content",icon:"▤",hint:"Titles & metadata"},
  {label:"Seasons & episodes",href:"/admin/seasons",icon:"▣",hint:"Episode structure"},
 ]},
 {label:"PLAYBACK",items:[
  {label:"Streaming servers",href:"/admin/servers",icon:"◉",hint:"Registered hosts"},
  {label:"Link import",href:"/admin/import",icon:"⇧",hint:"Add episode links"},
 ]},
];
export function AdminWorkspace({children}:{children:ReactNode}){
 const pathname=usePathname();
 if(!pathname.startsWith("/admin"))return <>{children}</>;
 const activeLabel=groups.flatMap(g=>g.items).find(item=>item.href==="/admin"?pathname==="/admin":pathname===item.href||pathname.startsWith(item.href+"/"))?.label??"Admin workspace";
 return <div className="admin-workspace">
  <aside className="admin-workspace__sidebar" aria-label="Admin navigation">
   <Link prefetch className="admin-workspace__brand" href="/admin"><span className="admin-workspace__brand-mark">AS</span><span className="admin-workspace__brand-copy"><strong>AniStream Studio</strong><small>ADMIN CONTROL CENTRE</small></span></Link>
   <div className="admin-workspace__mobile-title"><span>WORKSPACE</span><strong>{activeLabel}</strong></div>
   <nav className="admin-workspace__nav">
    {groups.map(group=><section className="admin-workspace__group" key={group.label}><p>{group.label}</p>{group.items.map(item=>{const active=item.href==="/admin"?pathname==="/admin":pathname===item.href||pathname.startsWith(item.href+"/");return <Link prefetch key={item.href} href={item.href} className={active?"is-active":""} aria-current={active?"page":undefined}><span className="admin-workspace__icon" aria-hidden="true">{item.icon}</span><span className="admin-workspace__link-copy"><strong>{item.label}</strong><small>{item.hint}</small></span>{active&&<i/>}</Link>;})}</section>)}
   </nav>
   <div className="admin-workspace__sidebar-note"><span className="admin-workspace__status-dot" aria-hidden="true">●</span><strong>Secure workspace</strong><Link prefetch href="/">View public site ↗</Link></div>
  </aside>
  <div className="admin-workspace__content">{children}</div>
 </div>;
}
