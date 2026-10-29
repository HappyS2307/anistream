import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const access = await getAdminAccess("links.import");
  if (access.status === "unconfigured") return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  if (access.status === "unauthenticated") return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  if (access.status === "forbidden") return NextResponse.json({ error: "You do not have permission to search content." }, { status: 403 });
  if (access.status !== "authorized") return NextResponse.json({ error: "Admin data is unavailable." }, { status: 503 });

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(0, Math.min(10_000, Number.parseInt(url.searchParams.get("page") ?? "0", 10) || 0));
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  let requestQuery = access.client
    .from("content")
    .select("id,slug,kind,title,publication_status", { count: "estimated" })
    .order("title")
    .range(from, to - 1);

  if (query) {
    const escaped = query.replace(/[^a-zA-Z0-9\\s\x27-]/g, " ").replace(/\\s+/g, " ").trim();
    if (!escaped) return NextResponse.json({ items: [], page, pageSize: PAGE_SIZE, hasMore: false });
    requestQuery = requestQuery.or(`title.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }

  const result = await requestQuery;
  if (result.error) return NextResponse.json({ error: "Content search is unavailable." }, { status: 503 });

  const items = result.data ?? [];
  return NextResponse.json({
    items: items.map(({ slug, title, kind }) => ({ slug, title, kind })),
    page,
    pageSize: PAGE_SIZE,
    hasMore: items.length === PAGE_SIZE,
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
