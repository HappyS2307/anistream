"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import type {ReactNode} from "react";

const groups=[
 {label:"OVERVIEW",items:[{label:"Dashboard",href:"/admin",icon:"▦"}]},
 {label:"CATALOGUE",items:[{label:"Content library",href:"/admin/content",icon:"▤"},{label:"Seasons & episodes",href:"/admin/seasons",icon:"▣"}]},
 {label:"PLAYBACK",items:[{label:"Streaming servers",href:"/admin/servers",icon:"◉"},{label:"Bulk link import",href:"/admin/import",icon:"⇧"}]},
];
export function AdminWorkspace({children}:{children:ReactNode}){
 const pathname=usePathname();
 if(!pathname.startsWith("/admin"))return <>{children}</>;
 return <div className="admin-workspace">
  <aside className="admin-workspace__sidebar" aria-label="Admin navigation">
   <div className="admin-workspace__brand"><span>AS</span><div><strong>Admin workspace</strong><small>ANISTREAM CONTROL</small></div></div>
   {groups.map(group=><section className="admin-workspace__group" key={group.label}><p>{group.label}</p>{group.items.map(item=>{const active=item.href==="/admin"?pathname==="/admin":pathname===item.href||pathname.startsWith(item.href+"/");return <Link key={item.href} href={item.href} className={active?"is-active":""} aria-current={active?"page":undefined}><span aria-hidden="true">{item.icon}</span>{item.label}{active&&<i/>}</Link>;})}</section>)}
   <div className="admin-workspace__sidebar-note"><span>●</span> Admin access protected</div>
  </aside>
  <div className="admin-workspace__content">{children}</div>
 </div>;
}
