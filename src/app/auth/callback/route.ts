import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth/redirect.mjs";
import { ensureAuthenticatedProfile } from "@/lib/data/auth";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectToLogin(siteUrl: string, reason: string) {
  const loginUrl = new URL("/login", siteUrl);
  loginUrl.searchParams.set("error", reason);
  return noStore(NextResponse.redirect(loginUrl));
}

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
  const config = getSupabasePublicConfig();

  if (!config) {
    return noStore(
      NextResponse.json(
        { error: "Authentication is not configured." },
        { status: 503 },
      ),
    );
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (requestUrl.searchParams.has("error") || !code) {
    return redirectToLogin(config.siteUrl, "oauth-callback");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return noStore(
      NextResponse.json(
        { error: "Authentication is not configured." },
        { status: 503 },
      ),
    );
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return redirectToLogin(config.siteUrl, "oauth-callback");
  }

  const profileStatus = await ensureAuthenticatedProfile(supabase);

  if (profileStatus === "unauthenticated") {
    await supabase.auth.signOut({ scope: "local" });
    return redirectToLogin(config.siteUrl, "oauth-callback");
  }

  if (profileStatus === "profile-error") {
    await supabase.auth.signOut({ scope: "local" });
    return redirectToLogin(config.siteUrl, "profile-setup");
  }

  const nextPath = getSafeRedirectPath(requestUrl.searchParams.get("next"));
  return noStore(NextResponse.redirect(new URL(nextPath, config.siteUrl)));
}