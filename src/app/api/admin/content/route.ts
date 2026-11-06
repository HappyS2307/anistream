import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

const PAGE_SIZE = 40;
const kinds = ["anime", "drama", "web_series", "movie"] as const;
const statuses = ["draft", "published", "archived"] as const;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content admin access required." }, access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80).replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  let query = access.client.from("content")
    .select("id,slug,kind,title,publication_status,created_at,poster_url,release_year")
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE + 1);
  const createdAt = url.searchParams.get("created_at");
  const id = url.searchParams.get("id");
  if (search) query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  if (createdAt && id && /^[0-9a-f-]{36}$/i.test(id) && !Number.isNaN(Date.parse(createdAt))) {
    query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`);
  }
  const { data, error } = await query;
  if (error) return json({ error: "Catalogue query failed." }, 503);
  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = items.at(-1);
  return json({ items, pageSize: PAGE_SIZE, nextCursor: hasMore && last ? { created_at: last.created_at, id: last.id } : null });
}

export async function POST(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content admin access required." }, access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid payload." }, 400);
    const value = body as Record<string, unknown>;
    if (typeof value.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) return json({ error: "Use a lowercase hyphenated slug." }, 400);
    if (typeof value.title !== "string" || !value.title.trim()) return json({ error: "Title is required." }, 400);
    if (typeof value.kind !== "string" || !kinds.includes(value.kind as typeof kinds[number])) return json({ error: "Choose a valid category." }, 400);
    if (value.publication_status !== undefined && !statuses.includes(value.publication_status as typeof statuses[number])) return json({ error: "Invalid publication status." }, 400);
    const allowed = ["slug","kind","title","synopsis","artwork_url","original_title","alternative_titles","poster_url","banner_url","logo_url","trailer_url","release_year","release_date","end_date","content_status","rating","age_rating","runtime_minutes","total_episodes","country_codes","language_codes","genres","tags","studios","is_featured","publication_status"];
    const payload: Record<string, unknown> = {};
    for (const key of allowed) if (key in value) payload[key] = value[key];
    const { data, error } = await access.client.from("content").insert(payload as never).select("id,slug,title").single();
    if (error) return json({ error: error.code === "23505" ? "That slug already exists." : "Unable to create title." }, error.code === "23505" ? 409 : 400);
    return json({ item: data }, 201);
  } catch { return json({ error: "Invalid request body." }, 400); }
}

export async function PATCH(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content admin access required." }, access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Valid content ID required." }, 400);
    const allowed = ["slug","kind","title","synopsis","artwork_url","original_title","alternative_titles","poster_url","banner_url","logo_url","trailer_url","release_year","release_date","end_date","content_status","rating","age_rating","runtime_minutes","total_episodes","country_codes","language_codes","genres","tags","studios","is_featured","publication_status"];
    const payload: Record<string, unknown> = {};
    for (const key of allowed) if (key in body) payload[key] = body[key];
    if (!Object.keys(payload).length) return json({ error: "No fields to update." }, 400);
    const { data, error } = await access.client.from("content").update(payload as never).eq("id", id).select("id,slug,title").maybeSingle();
    if (error) return json({ error: error.code === "23505" ? "That slug already exists." : "Unable to update title." }, error.code === "23505" ? 409 : 400);
    if (!data) return json({ error: "Title not found." }, 404);
    return json({ item: data });
  } catch { return json({ error: "Invalid request body." }, 400); }
}

export async function DELETE(request: Request) {
  const access = await getAdminAccess("content.manage");
  if (access.status !== "authorized") return json({ error: "Content admin access required." }, access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Valid content ID required." }, 400);
  const { data, error } = await access.client.from("content").delete().eq("id", id).select("id").maybeSingle();
  if (error) return json({ error: "Delete failed; check related seasons, episodes or sources." }, 400);
  if (!data) return json({ error: "Title not found." }, 404);
  return json({ deleted: true });
}
