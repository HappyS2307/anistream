import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HINDIANIME_WORKER_URL;
  if (!base) {
    return NextResponse.json({ ok: false, service: "hindianime", error: "Provider adapter is not configured." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const response = await fetch(new URL("/health", base), {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return NextResponse.json({ ok: false, service: "hindianime", error: "Provider adapter health check failed." }, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("ok" in payload) ||
      payload.ok !== true
    ) {
      return NextResponse.json({ ok: false, service: "hindianime", error: "Provider adapter returned an invalid health response." }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ ok: true, service: "hindianime" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, service: "hindianime", error: "Provider adapter is unreachable." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
