"use server";

import { redirect } from "next/navigation";
import { getSafeRedirectPath } from "@/lib/auth/redirect.mjs";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
};

export async function signInWithGoogle(
  _previousState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const config = getSupabasePublicConfig();

  if (!config) {
    return { error: "Google sign-in is not configured for this environment." };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Google sign-in is not configured for this environment." };
  }

  const nextPath = getSafeRedirectPath(formData.get("next"));
  const callbackUrl = new URL("/auth/callback", config.siteUrl);
  callbackUrl.searchParams.set("next", nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    return { error: "Google sign-in could not be started. Please try again." };
  }

  try {
    if (new URL(data.url).origin !== new URL(config.url).origin) {
      return { error: "Google sign-in returned an unexpected destination." };
    }
  } catch {
    return { error: "Google sign-in returned an invalid destination." };
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut({ scope: "local" });
  }

  redirect("/");
}