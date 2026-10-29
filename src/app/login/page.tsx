import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { SiteFrame } from "@/components/site-frame";
import { getSafeRedirectPath } from "@/lib/auth/redirect.mjs";

type LoginSearchParams = {
  next?: string | string[];
  error?: string | string[];
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  return (
    <SiteFrame>
      <main id="main-content">
        <Suspense fallback={<LoginLoading />}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </main>
    </SiteFrame>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(
    Array.isArray(params.next) ? params.next[0] : params.next,
  );
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <section className="auth-page page-container" aria-labelledby="login-title">
      <div className="auth-panel">
        <p className="eyebrow">
          <span className="eyebrow__dot" aria-hidden="true" />
          ANISTREAM ACCOUNT
        </p>
        <h1 id="login-title">Welcome back.</h1>
        <p className="auth-panel__description">
          Sign in with Google to continue. Your account setup is still in progress.
        </p>
        {errorCode ? (
          <p className="login-form__error" role="alert">
            {errorCode === "profile-setup"
              ? "Your account could not be initialized. Confirm that the approved database migration has been applied."
              : "Google sign-in did not complete. Please try again."}
          </p>
        ) : null}
        <LoginForm nextPath={nextPath} />
        <p className="auth-panel__note">
          This sign-in is unavailable until Supabase and Google OAuth are configured.
        </p>
      </div>
    </section>
  );
}

function LoginLoading() {
  return (
    <section className="auth-page page-container" aria-busy="true">
      <p className="sr-only" role="status">
        Loading sign-in
      </p>
      <div className="auth-panel auth-panel--loading skeleton-shimmer" />
    </section>
  );
}