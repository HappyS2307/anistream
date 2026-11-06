import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";
import { HomepageStudio } from "./homepage-studio";
const defaults=[
 {section_key:"latest",title:"Recently added",enabled:true,sort_order:1},
 {section_key:"anime",title:"Anime",enabled:true,sort_order:2},
 {section_key:"drama",title:"Drama",enabled:true,sort_order:3},
 {section_key:"web_series",title:"Web Series",enabled:true,sort_order:4},
 {section_key:"movies",title:"Movies",enabled:true,sort_order:5},
 {section_key:"discover_banner",title:"Discover more",enabled:true,sort_order:6},
];
export default async function HomepageStudioPage(){
 const access=await getAdminAccess("content.manage");
 if(access.status!=="authorized"){
  const message=access.status==="unauthenticated"?"Sign in with an authorised admin account.":access.status==="forbidden"?"Your account does not have content-management permission.":"Homepage settings are unavailable. Check Supabase configuration and migrations.";
  return <SiteFrame><main className="page-container" style={{paddingBlock:56}}><p className="eyebrow">ANISTREAM / HOMEPAGE</p><h1>Homepage studio</h1><p>{message}</p><Link className="button button--primary" href="/admin">Back to dashboard</Link></main></SiteFrame>;
 }
 const {data,error}=await (access.client as any).from("homepage_sections").select("section_key,title,enabled,sort_order").order("sort_order");
 return <SiteFrame><main className="page-container" style={{paddingBlock:"42px 80px",maxWidth:1000}}>
  <p className="eyebrow">ANISTREAM / EDITORIAL CONTROL</p><h1 style={{fontSize:"clamp(2rem,5vw,3rem)",margin:"8px 0"}}>Homepage studio</h1>
  <p style={{color:"var(--muted)",maxWidth:700}}>Rename, show or hide homepage sections and change their display order. The featured hero title is managed separately in Content Library.</p>
  {error?<p role="alert" className="surface-card" style={{padding:18}}>Could not load homepage settings. Confirm the homepage sections migration has been applied.</p>:<HomepageStudio initialSections={data?.length===6?data:defaults}/>}
 </main></SiteFrame>;
}