import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

const permissionKeys = ["content.manage", "links.import", "streaming.manage", "downloads.manage"] as const;
type PermissionKey = typeof permissionKeys[number];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanPermissions(value: unknown): Record<PermissionKey, boolean> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !permissionKeys.includes(key as PermissionKey))) return null;
  if (Object.values(input).some((item) => typeof item !== "boolean")) return null;
  return Object.fromEntries(permissionKeys.map((key) => [key, input[key] === true])) as Record<PermissionKey, boolean>;
}

export async function POST(request: Request) {
  const access = await getAdminAccess("admin.manage");
  if (access.status !== "authorized") return NextResponse.json({ error: "Admin-management permission required." }, { status: access.status === "unauthenticated" ? 401 : 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const input = body as { userId?: unknown; permissions?: unknown };
  if (typeof input.userId !== "string" || !uuidPattern.test(input.userId)) return NextResponse.json({ error: "Enter a valid account UUID." }, { status: 400 });
  const permissions = cleanPermissions(input.permissions);
  if (!permissions) return NextResponse.json({ error: "Invalid permissions." }, { status: 400 });
  if (input.userId === access.userId) return NextResponse.json({ error: "You cannot change your own admin membership here." }, { status: 400 });
  const { error } = await access.client.from("admin_memberships").insert({ user_id: input.userId, role: "admin", permissions, created_by: access.userId });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "This account already has an admin membership." : error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const access = await getAdminAccess("admin.manage");
  if (access.status !== "authorized") return NextResponse.json({ error: "Admin-management permission required." }, { status: access.status === "unauthenticated" ? 401 : 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const input = body as { userId?: unknown; permissions?: unknown };
  if (typeof input.userId !== "string" || !uuidPattern.test(input.userId)) return NextResponse.json({ error: "Invalid account UUID." }, { status: 400 });
  const permissions = cleanPermissions(input.permissions);
  if (!permissions) return NextResponse.json({ error: "Invalid permissions." }, { status: 400 });
  if (input.userId === access.userId) return NextResponse.json({ error: "You cannot change your own permissions." }, { status: 400 });
  const { data, error } = await access.client.from("admin_memberships").update({ permissions }).eq("user_id", input.userId).eq("role", "admin").select("user_id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Admin account not found or cannot be changed." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const access = await getAdminAccess("admin.manage");
  if (access.status !== "authorized") return NextResponse.json({ error: "Admin-management permission required." }, { status: access.status === "unauthenticated" ? 401 : 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const input = body as { userId?: unknown };
  if (typeof input.userId !== "string" || !uuidPattern.test(input.userId)) return NextResponse.json({ error: "Invalid account UUID." }, { status: 400 });
  if (input.userId === access.userId) return NextResponse.json({ error: "You cannot revoke your own membership." }, { status: 400 });
  const { data, error } = await access.client.from("admin_memberships").delete().eq("user_id", input.userId).eq("role", "admin").select("user_id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Admin account not found or cannot be removed." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
