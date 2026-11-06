import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";
import { SeasonEpisodeManager } from "./season-episode-manager";
export default async function AdminSeasonsPage(){
 const a=await getAdminAccess("content.manage");
 if(a.status!=="authorized"){const msg=a.status==="unauthenticated"?"Sign in with an authorised administrator account.":a.status==="forbidden"?"Your account does not have content.manage permission.":"Season management is unavailable.";return <SiteFrame><main className="page-container season-admin"><h1>Seasons & episodes</h1><p>{msg}</p><Link className="button button--primary" href="/login?next=%2Fadmin%2Fseasons">Sign in</Link></main></SiteFrame>;}
 const {data,error}=await a.client.from("content").select("id,slug,title,kind").order("title").limit(24);
 return <SiteFrame><main>{error?<section className="page-container season-admin"><h1>Seasons & episodes</h1><p>Could not load catalogue.</p></section>:<SeasonEpisodeManager contents={data??[]}/>}</main></SiteFrame>;
}