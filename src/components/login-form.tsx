"use client";

import { useActionState } from "react";
import {
  signInWithGoogle,
  type AuthActionState,
} from "@/lib/auth/actions";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState<AuthActionState | undefined, FormData>(
    signInWithGoogle,
    undefined,
  );

  return (
    <form action={action} className="login-form">
      <input type="hidden" name="next" value={nextPath} />
      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? "Connecting to Google…" : "Continue with Google"}
        <span aria-hidden="true">↗</span>
      </button>
      {state?.error ? (
        <p className="login-form__error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}