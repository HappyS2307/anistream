import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";
import { StreamingServerManager } from "./streaming-server-manager";

export default async function AdminStreamingServersPage() {
  const access = await getAdminAccess("streaming.manage");
  if (access.status !== "authorized") {
    const message = access.status === "unauthenticated" ? "Sign in with an administrator account that has streaming-management permission." : access.status === "forbidden" ? "Your account does not have streaming.manage permission." : "Streaming server management is unavailable. Check Supabase configuration and migrations.";
    return <SiteFrame><main className="page-container server-admin"><p className="eyebrow">ANISTREAM / PLAYBACK INFRASTRUCTURE</p><h1>Streaming servers</h1><p>{message}</p><Link className="button button--primary" href="/login?next=%2Fadmin%2Fservers">Sign in</Link></main></SiteFrame>;
  }
  const { data, error } = await access.client.from("streaming_servers").select("id,name,hostname,enabled,protection_enabled,created_at").order("created_at",{ascending:false}).limit(200);
  if (error) return <SiteFrame><main className="page-container server-admin"><h1>Streaming servers</h1><p>Could not load server records. Check the database permissions.</p></main></SiteFrame>;
  const items = await Promise.all((data ?? []).map(async server => {
    const count = await access.client.from("streaming_sources").select("id",{count:"exact",head:true}).eq("server_id",server.id);
    return {...server,source_count:count.count ?? 0};
  }));
  return <SiteFrame><main><StreamingServerManager initialItems={items}/></main></SiteFrame>;
}
