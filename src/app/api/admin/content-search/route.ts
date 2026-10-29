import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/data/admin";

const PAGE_SIZE = 25;

function privateJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(request: Request) {
  const access = await getAdminAccess("links.import");
  if (access.status === "unconfigured") return privateJson({ error: "Authentication is not configured." }, { status: 503 });
  if (access.status === "unauthenticated") return privateJson({ error: "Sign in is required." }, { status: 401 });
  if (access.status === "forbidden") return privateJson({ error: "You do not have permission to search content." }, { status: 403 });
  if (access.status !== "authorized") return privateJson({ error: "Admin data is unavailable." }, { status: 503 });

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const rawPage = url.searchParams.get("page") ?? "0";
  const parsedPage = /^\d+$/.test(rawPage) ? Number(rawPage) : 0;
  const page = Math.max(0, Math.min(10_000, Number.isSafeInteger(parsedPage) ? parsedPage : 0));
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  let requestQuery = access.client
    .from("content")
    .select("id,slug,kind,title,publication_status", { count: "estimated" })
    .order("title")
    .range(from, to - 1);

  if (query) {
    const escaped = query.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
    if (!escaped) return privateJson({ items: [], page, pageSize: PAGE_SIZE, hasMore: false });
    requestQuery = requestQuery.or(`title.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }

  const result = await requestQuery;
  if (result.error) return privateJson({ error: "Content search is unavailable." }, { status: 503 });

  const items = result.data ?? [];
  return privateJson({
    items: items.map(({ slug, title, kind }) => ({ slug, title, kind })),
    page,
    pageSize: PAGE_SIZE,
    hasMore: items.length === PAGE_SIZE,
  });
}
