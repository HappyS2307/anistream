import { signOut } from "@/lib/auth/actions";
import { getAuthenticatedUser } from "@/lib/data/auth";

export async function AuthAccountControl() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <a className="site-header__action" href="/login">
        Sign in <span aria-hidden="true">↗</span>
      </a>
    );
  }

  return (
    <div className="site-header__account">
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