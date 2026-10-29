import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";

const tools = [
  {
    title: "Content catalogue",
    description: "Anime, Drama, Movies aur Web Series ke metadata manage karne ka next module.",
    status: "Planned",
    href: "/admin",
  },
  {
    title: "Seasons & episodes",
    description: "Season structure, episode numbering aur titles ka management.",
    status: "Planned",
    href: "/admin",
  },
  {
    title: "Streaming & downloads",
    description: "Enabled servers/providers aur approved playback URLs.",
    status: "Import available",
    href: "/admin/import",
  },
  {
    title: "Users & permissions",
    description: "Admin roles aur permissions. Access server-side verify hota hai.",
    status: "Setup required",
    href: "/admin",
  },
];

export default async function AdminDashboardPage() {
  const access = await getAdminAccess("links.import");

  if (access.status !== "authorized") {
    const message =
      access.status === "unconfigured"
        ? "Supabase is not configured yet. Configure the project before enabling admin tools."
        : access.status === "unauthenticated"
          ? "Sign in with an authorized admin account to open the admin area."
          : access.status === "forbidden"
            ? "This account does not have admin dashboard access."
            : "Admin permissions could not be checked. Verify the database migrations and Supabase configuration.";

    return (
      <SiteFrame>
        <main className="page-container" style={{ paddingBlock: 64 }}>
          <p className="eyebrow">ANISTREAM / ADMIN</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-0.05em" }}>Admin dashboard</h1>
          <section className="surface-card" style={{ maxWidth: 680, padding: 24, marginTop: 24 }}>
            <p style={{ marginTop: 0 }}>{message}</p>
            <Link className="button button--quiet" href="/login?next=%2Fadmin">Go to sign in</Link>
          </section>
        </main>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <main className="page-container" style={{ paddingBlock: "40px 80px" }}>
        <p className="eyebrow"><span className="eyebrow__dot" aria-hidden="true" /> ANISTREAM / CONTROL CENTRE</p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", justifyContent: "space-between", gap: 20, marginTop: 8 }}>
          <div>
            <h1 style={{ fontSize: "clamp(2.25rem, 5vw, 3.75rem)", letterSpacing: "-0.055em", lineHeight: 1.05, margin: 0 }}>Admin dashboard</h1>
            <p style={{ color: "var(--muted)", marginBottom: 0, maxWidth: 640 }}>Manage the catalogue and playback infrastructure from one place. Modules are clearly marked until their database workflows are implemented and verified.</p>
          </div>
          <Link className="button" href="/admin/import">Open bulk import <span aria-hidden="true">↗</span></Link>
        </div>

        <section aria-labelledby="admin-overview-title" style={{ marginTop: 36 }}>
          <h2 id="admin-overview-title" style={{ fontSize: 18, marginBottom: 14 }}>Workspace status</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
            <div className="surface-card" style={{ padding: 20 }}>
              <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>Authentication</p>
              <p style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 0" }}>Verified for this request</p>
            </div>
            <div className="surface-card" style={{ padding: 20 }}>
              <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>Permission check</p>
              <p style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 0" }}>Server-side</p>
            </div>
            <div className="surface-card" style={{ padding: 20 }}>
              <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>Live database setup</p>
              <p style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 0" }}>Requires verification</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="admin-tools-title" style={{ marginTop: 38 }}>
          <h2 id="admin-tools-title" style={{ fontSize: 18, marginBottom: 14 }}>Management modules</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14 }}>
            {tools.map((tool) => {
              const available = tool.href === "/admin/import";
              return (
                <article className="surface-card" key={tool.title} style={{ padding: 22, display: "flex", flexDirection: "column", minHeight: 190 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <h3 style={{ fontSize: 18, margin: 0 }}>{tool.title}</h3>
                    <span style={{ fontSize: 11, color: available ? "var(--accent-light)" : "var(--muted)", border: "1px solid var(--line)", borderRadius: 99, padding: "4px 8px", whiteSpace: "nowrap" }}>{tool.status}</span>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 14, flex: 1 }}>{tool.description}</p>
                  {available ? <Link className="button button--quiet" href={tool.href}>Open module <span aria-hidden="true">→</span></Link> : <p style={{ color: "var(--subtle)", fontSize: 12, marginBottom: 0 }}>Not enabled yet — no placeholder actions are exposed.</p>}
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </SiteFrame>
  );
}
