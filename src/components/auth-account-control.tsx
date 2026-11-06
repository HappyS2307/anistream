import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { getAuthenticatedUser } from "@/lib/data/auth";
import { getAdminAccess } from "@/lib/data/admin";

export async function AuthAccountControl() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <a className="site-header__action" href="/login">
        Sign in <span aria-hidden="true">↗</span>
      </a>
    );
  }

  // Visibility is permission-based. Non-admin users never receive the admin shortcut.
  const adminAccess = await getAdminAccess("content.manage");
  const canOpenAdmin = adminAccess.status === "authorized";

  return (
    <div className="site-header__account">
      {canOpenAdmin ? (
        <Link
          className="site-header__admin-link"
          href="/admin"
          aria-label="Open admin panel"
          title="Admin panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <path d="M12 3.25 19 6v5.2c0 4.45-2.85 7.8-7 9.55-4.15-1.75-7-5.1-7-9.55V6l7-2.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sr-only">Admin panel</span>
        </Link>
      ) : null}
      <span className="site-header__account-name" title={user.email ?? undefined}>
        {user.email ?? "Account"}
      </span>
      <form action={signOut}>
        <button className="site-header__logout" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
