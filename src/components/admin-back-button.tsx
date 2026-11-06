"use client";

import { usePathname, useRouter } from "next/navigation";

export function AdminBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (!pathname.startsWith("/admin")) return null;

  function goBack() {
    const referrer = document.referrer;
    if (referrer) {
      try {
        if (new URL(referrer).origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {
        // Fall back to the admin dashboard when the referrer is invalid.
      }
    }
    router.push(pathname === "/admin" ? "/" : "/admin");
  }

  return (
    <div className="admin-backbar">
      <div className="page-container admin-backbar__inner">
        <button type="button" className="admin-back-button" onClick={goBack} aria-label="Go back">
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </button>
        <span className="admin-backbar__location">ADMIN WORKSPACE</span>
      </div>
    </div>
  );
}
