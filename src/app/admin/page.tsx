import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getAdminAccess } from "@/lib/data/admin";

type Metric = { label: string; value: number | null; note: string; href?: string };

function MetricCard({ label, value, note, href }: Metric) {
  const body = <><span className="admin-metric__label">{label}</span><strong className="admin-metric__value">{value === null ? "—" : value.toLocaleString("en-IN")}</strong><span className="admin-metric__note">{note}</span></>;
  return href ? <Link className="admin-metric surface-card" href={href}>{body}<span className="admin-metric__arrow" aria-hidden="true">↗</span></Link> : <article className="admin-metric surface-card">{body}</article>;
}

const modules = [
  { number: "01", title: "Content catalogue", description: "Create, edit, publish and organise titles across Anime, Drama, Web Series and Movies.", href: "/admin/content", state: "Available", active: true },
  { number: "02", title: "Streaming servers", description: "Add embed hosts, control server availability and switch playback protection per server.", href: "/admin/servers", state: "Available", active: true },
  { number: "03", title: "Episode playback links", description: "Attach approved streaming URLs to episodes using a registered server.", href: "/admin/import", state: "Link tools", active: true },
  { number: "04", title: "Seasons & episodes", description: "Build season structures, episode numbering and episode metadata.", state: "In development" },
  { number: "05", title: "User management", description: "Review accounts, assign admin roles and manage granular permissions.", state: "In development" },
  { number: "06", title: "Homepage studio", description: "Control hero artwork, featured titles, collections and section ordering.", state: "In development" },
  { number: "07", title: "Customisation studio", description: "Configure AniStream branding, visual themes, layout and responsive presentation.", state: "In development" },
];

export default async function AdminDashboardPage() {
  const access = await getAdminAccess("content.manage");

  if (access.status !== "authorized") {
    const message = access.status === "unconfigured"
      ? "Supabase is not configured yet. Configure the project before enabling admin tools."
      : access.status === "unauthenticated"
        ? "Sign in with an authorised admin account to open the admin area."
        : access.status === "forbidden"
          ? "This account does not have admin dashboard access."
          : "Admin permissions could not be checked. Verify the database migrations and Supabase configuration.";
    return <SiteFrame><main className="page-container admin-gate"><p className="eyebrow">ANISTREAM / CONTROL CENTRE</p><h1>Admin dashboard</h1><section className="surface-card admin-gate__card"><p>{message}</p><Link className="button button--primary" href="/login?next=%2Fadmin">Go to sign in <span>↗</span></Link></section></main></SiteFrame>;
  }

  const client = access.client;
  const [userResult, content, published, drafts, seasons, episodes, streams, downloads, users, recent] = await Promise.all([
    client.auth.getUser(),
    client.from("content").select("id", { count: "exact", head: true }),
    client.from("content").select("id", { count: "exact", head: true }).eq("publication_status", "published"),
    client.from("content").select("id", { count: "exact", head: true }).eq("publication_status", "draft"),
    client.from("seasons").select("id", { count: "exact", head: true }),
    client.from("episodes").select("id", { count: "exact", head: true }),
    client.from("streaming_sources").select("id", { count: "exact", head: true }).eq("enabled", true),
    client.from("download_sources").select("id", { count: "exact", head: true }).eq("enabled", true),
    client.from("profiles").select("user_id", { count: "exact", head: true }),
    client.from("content").select("id,title,kind,publication_status,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  const failed = [content, published, drafts, seasons, episodes, streams, downloads, users, recent].some((result) => result.error);
  const metrics: Metric[] = [
    { label: "Total titles", value: content.count, note: "All catalogue records", href: "/admin/content" },
    { label: "Published", value: published.count, note: "Visible in public catalogue", href: "/admin/content" },
    { label: "Draft titles", value: drafts.count, note: "Awaiting publication", href: "/admin/content" },
    { label: "Registered profiles", value: users.count, note: "Accounts with a profile" },
    { label: "Seasons", value: seasons.count, note: "Across all titles" },
    { label: "Episodes", value: episodes.count, note: "Across all seasons" },
    { label: "Active stream links", value: streams.count, note: "Enabled playback sources", href: "/admin/import" },
    { label: "Active download links", value: downloads.count, note: "Enabled download sources", href: "/admin/import" },
  ];
  const recentItems = recent.data ?? [];
  const accountLabel = userResult.data.user?.email ?? "Authorised administrator";

  return (
    <SiteFrame>
      <main className="page-container admin-dashboard">
        <div className="admin-dashboard__topline"><p className="eyebrow"><span className="eyebrow__dot" /> ANISTREAM / CONTROL CENTRE</p><span className="admin-live"><i /> LIVE WORKSPACE</span></div>
        <header className="admin-hero">
          <div><p className="admin-hero__kicker">ADMINISTRATOR WORKSPACE</p><h1>Control <span>everything.</span></h1><p className="admin-hero__description">Your catalogue, playback infrastructure and platform operations — brought together in one place.</p><div className="admin-hero__actions"><Link className="button button--primary" href="/admin/content">Manage catalogue <span>↗</span></Link><span className="admin-hero__identity">Signed in as <strong>{accountLabel}</strong></span></div></div>
          <div className="admin-hero__seal" aria-hidden="true"><span>AS</span><small>CONTROL<br/>CENTRE</small></div>
        </header>

        <section className="admin-section" aria-labelledby="admin-metrics-title">
          <div className="admin-section__heading"><div><p className="admin-section__eyebrow">AT A GLANCE</p><h2 id="admin-metrics-title">Platform overview</h2></div><span className="admin-section__caption">Live database counts · refresh to update</span></div>
          {failed && <p className="admin-notice" role="status">Some database metrics could not be loaded. Unavailable values are shown as dashes; check table permissions and migrations.</p>}
          <div className="admin-metrics">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
        </section>

        <section className="admin-section" aria-labelledby="admin-modules-title">
          <div className="admin-section__heading"><div><p className="admin-section__eyebrow">WORKSPACE TOOLS</p><h2 id="admin-modules-title">Management modules</h2></div><span className="admin-section__caption">Built around your workflow</span></div>
          <div className="admin-modules">{modules.map((module) => <article className={`admin-module surface-card ${module.active ? "is-active" : "is-planned"}`} key={module.number}><div className="admin-module__top"><span>{module.number}</span><span className="admin-module__state">{module.state}</span></div><h3>{module.title}</h3><p>{module.description}</p>{module.active ? <Link href={module.href!} className="admin-module__link">Open module <span>↗</span></Link> : <span className="admin-module__roadmap">Being built — no inactive controls</span>}</article>)}</div>
        </section>

        <section className="admin-section admin-lower">
          <div className="admin-recent surface-card"><div className="admin-section__heading"><div><p className="admin-section__eyebrow">CATALOGUE ACTIVITY</p><h2>Recently updated</h2></div><Link className="admin-text-link" href="/admin/content">View catalogue ↗</Link></div>
            {recentItems.length ? <div className="admin-recent__list">{recentItems.map((item) => <div className="admin-recent__item" key={item.id}><span className="admin-recent__kind">{item.kind.replace("_", " ")}</span><strong>{item.title}</strong><span className={`admin-status admin-status--${item.publication_status}`}>{item.publication_status}</span></div>)}</div> : <p className="admin-empty">No catalogue titles yet. Create your first title to start building the library.</p>}
          </div>
          <aside className="admin-health surface-card"><p className="admin-section__eyebrow">WORKSPACE SECURITY</p><h2>Access verified</h2><p>Your admin permission was checked on the server for this request. Admin routes continue to enforce their own permissions.</p><div className="admin-health__row"><span>Authentication</span><strong>Verified</strong></div><div className="admin-health__row"><span>Permission</span><strong>content.manage</strong></div><div className="admin-health__row"><span>Database</span><strong>{failed ? "Partial response" : "Connected"}</strong></div></aside>
        </section>
      </main>
    </SiteFrame>
  );
}
