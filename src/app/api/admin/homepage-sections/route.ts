import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";
const allowed = new Set(["latest","anime","drama","web_series","movies","discover_banner"]);
export async function PATCH(request: Request) {
 const access = await getAdminAccess("content.manage");
 if (access.status !== "authorized") return NextResponse.json({error:"Content-management permission required."},{status:access.status==="unauthenticated"?401:403});
 let body: unknown; try { body=await request.json(); } catch { return NextResponse.json({error:"Invalid request body."},{status:400}); }
 const input=body as {sections?:unknown};
 if (!Array.isArray(input.sections)||input.sections.length!==6) return NextResponse.json({error:"All homepage sections must be included."},{status:400});
 const seen=new Set<string>(); const rows=[];
 for(const item of input.sections) {
  if(!item||typeof item!=="object") return NextResponse.json({error:"Invalid section."},{status:400});
  const row=item as {section_key?:unknown;title?:unknown;enabled?:unknown;sort_order?:unknown};
  if(typeof row.section_key!=="string"||!allowed.has(row.section_key)||seen.has(row.section_key)||typeof row.title!=="string"||row.title.trim().length<1||row.title.trim().length>80||typeof row.enabled!=="boolean"||!Number.isInteger(row.sort_order)||Number(row.sort_order)<0) return NextResponse.json({error:"Check section names, visibility and ordering."},{status:400});
  seen.add(row.section_key); rows.push({section_key:row.section_key,title:row.title.trim(),enabled:row.enabled,sort_order:Number(row.sort_order)});
 }
 const client=access.client as any;
 const results=await Promise.all(rows.map(row=>client.from("homepage_sections").update({title:row.title,enabled:row.enabled,sort_order:row.sort_order}).eq("section_key",row.section_key)));
 const failed=results.find((result:any)=>result.error);
 if(failed) return NextResponse.json({error:failed.error.message},{status:400});
 return NextResponse.json({ok:true});
}