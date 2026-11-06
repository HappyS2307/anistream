import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";
import { UserManagement } from "./user-management";

export default async function AdminUsersPage() {
  const access = await getAdminAccess("admin.manage");
  if (access.status !== "authorized") {
    const message = access.status === "unauthenticated" ? "Sign in with an authorised Super Admin account." : access.status === "forbidden" ? "Only the Super Admin can manage administrator accounts." : "User management is unavailable. Check Supabase configuration and migrations.";
    return <SiteFrame><main className="page-container" style={{paddingBlock:56}}><p className="eyebrow">ANISTREAM / ACCESS CONTROL</p><h1>User management</h1><p>{message}</p><Link className="button button--primary" href="/admin">Back to dashboard</Link></main></SiteFrame>;
  }
  const { data, error } = await access.client.from("admin_memberships").select("user_id,role,permissions,created_at").order("created_at",{ascending:false}).limit(200);
  return <SiteFrame><main className="page-container" style={{paddingBlock:"42px 80px",maxWidth:1100}}>
    <p className="eyebrow">ANISTREAM / ACCESS CONTROL</p>
    <h1 style={{fontSize:"clamp(2rem,5vw,3rem)",margin:"8px 0"}}>User management</h1>
    <p style={{color:"var(--muted)",maxWidth:720}}>Grant or revoke administrator access and assign permissions. Super Admin privileges are protected and cannot be changed here.</p>
    {error ? <p role="alert" className="surface-card" style={{padding:18}}>Could not load admin memberships. Check database policies.</p> : <UserManagement initialItems={(data??[]).map(item=>({...item,permissions:(item.permissions??{}) as Record<string,boolean>}))} currentUserId={access.userId}/>}
  </main></SiteFrame>;
}
