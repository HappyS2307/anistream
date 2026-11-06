import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const hostPattern = /^(?=.{1,253}$)[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

function authStatus(status: string) {
  return status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : 503;
}

export async function GET() {
  const access = await getAdminAccess("streaming.manage");
  if (access.status !== "authorized") return json({ error: "Streaming management permission required." }, authStatus(access.status));
  const { data, error } = await access.client.from("streaming_servers")
    .select("id,name,hostname,enabled,protection_enabled,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return json({ error: "Could not load streaming servers." }, 503);
  const servers = data ?? [];
  const counts = await Promise.all(servers.map(async (server) => {
    const result = await access.client.from("streaming_sources")
      .select("id", { count: "exact", head: true }).eq("server_id", server.id);
    return [server.id, result.count ?? 0] as const;
  }));
  return json({ items: servers.map((server) => ({ ...server, source_count: new Map(counts).get(server.id) ?? 0 })) });
}

export async function POST(request: Request) {
  const access = await getAdminAccess("streaming.manage");
  if (access.status !== "authorized") return json({ error: "Streaming management permission required." }, authStatus(access.status));
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const hostname = typeof body.hostname === "string" ? body.hostname.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
    if (!name || name.length > 80) return json({ error: "Server name must be 1–80 characters." }, 400);
    if (!hostPattern.test(hostname)) return json({ error: "Enter a valid hostname only, without https://, path or port." }, 400);
    const { data, error } = await access.client.from("streaming_servers")
      .insert({ name, hostname, created_by: access.userId })
      .select("id,name,hostname,enabled,protection_enabled,created_at").single();
    if (error) return json({ error: error.code === "23505" ? "A server with this name or hostname already exists." : "Could not create server. Check your streaming.manage permission." }, error.code === "23505" ? 409 : 400);
    return json({ item: data }, 201);
  } catch { return json({ error: "Invalid request body." }, 400); }
}

export async function PATCH(request: Request) {
  const access = await getAdminAccess("streaming.manage");
  if (access.status !== "authorized") return json({ error: "Streaming management permission required." }, authStatus(access.status));
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Valid server ID required." }, 400);
    const payload: Record<string, unknown> = {};
    if ("enabled" in body) {
      if (typeof body.enabled !== "boolean") return json({ error: "Enabled must be on or off." }, 400);
      payload.enabled = body.enabled;
    }
    if ("protection_enabled" in body) {
      if (typeof body.protection_enabled !== "boolean") return json({ error: "Protection must be on or off." }, 400);
      payload.protection_enabled = body.protection_enabled;
    }
    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) return json({ error: "Server name must be 1–80 characters." }, 400);
      payload.name = body.name.trim();
    }
    if ("hostname" in body) {
      if (typeof body.hostname !== "string") return json({ error: "Invalid hostname." }, 400);
      const hostname = body.hostname.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (!hostPattern.test(hostname)) return json({ error: "Enter a valid hostname only, without protocol, path or port." }, 400);
      payload.hostname = hostname;
    }
    if (!Object.keys(payload).length) return json({ error: "No server settings supplied." }, 400);
    const { data, error } = await access.client.from("streaming_servers").update(payload as never).eq("id", id)
      .select("id,name,hostname,enabled,protection_enabled,created_at").maybeSingle();
    if (error) return json({ error: error.code === "23505" ? "That name or hostname is already in use." : "Could not update server." }, error.code === "23505" ? 409 : 400);
    if (!data) return json({ error: "Server not found." }, 404);
    return json({ item: data });
  } catch { return json({ error: "Invalid request body." }, 400); }
}

export async function DELETE(request: Request) {
  const access = await getAdminAccess("streaming.manage");
  if (access.status !== "authorized") return json({ error: "Streaming management permission required." }, authStatus(access.status));
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Valid server ID required." }, 400);
  const { data, error } = await access.client.from("streaming_servers").delete().eq("id", id).select("id").maybeSingle();
  if (error) return json({ error: "This server still has streaming links. Disable it or reassign those links before deleting." }, 409);
  if (!data) return json({ error: "Server not found." }, 404);
  return json({ deleted: true });
}
