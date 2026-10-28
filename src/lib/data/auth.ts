import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  return getAuthenticatedUserFromClient(supabase);
}

async function getAuthenticatedUserFromClient(
  supabase: SupabaseClient<Database>,
): Promise<AuthenticatedUser | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export async function ensureAuthenticatedProfile(
  supabase: SupabaseClient<Database>,
): Promise<"unauthenticated" | "profile-error" | "ok"> {
  const user = await getAuthenticatedUserFromClient(supabase);

  if (!user) {
    return "unauthenticated";
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  return profileError ? "profile-error" : "ok";
}