import type { Metadata } from "next";
import Link from "next/link";
import { gate } from "@/components/admin/gate";
import { countMessages, loadPosts } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Overview" };

export default async function Page() {
  const g = await gate();
  if (!g.ok) return g.view;
  const [posts, messages] = await Promise.all([loadPosts(g.db), countMessages(g.db)]);
  const count = (type: string, status: string) => posts.filter((p) => p.type === type && p.status === status).length;
  const recent = [...posts].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, 5);
  const base = { case_study: "/admin/case-studies", article: "/admin/articles" } as const;
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Overview</h1>
          <p>Signed in as {g.email}.</p>
        </div>
      </div>
      <div className="adm-stats">
        <div className="adm-stat"><b>{count("case_study", "published")}</b><span>Case studies published</span></div>
        <div className="adm-stat"><b>{count("case_study", "draft")}</b><span>Case studies draft</span></div>
        <div className="adm-stat"><b>{count("article", "published")}</b><span>Articles published</span></div>
        <div className="adm-stat"><b>{count("article", "draft")}</b><span>Articles draft</span></div>
        <Link className="adm-stat" href="/admin/messages"><b>{messages.unread}</b><span>New messages</span></Link>
        <Link className="adm-stat" href="/admin/messages"><b>{messages.total}</b><span>Total messages</span></Link>
      </div>
      <section className="adm-card">
        <h2>Last 5 edits</h2>
        <table className="adm-table">
          <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Edited</th></tr></thead>
          <tbody>
            {recent.map((p) => (
              <tr key={p.id}>
                <td><Link href={`${base[p.type]}/${p.id}`}>{p.title}</Link></td>
                <td>{p.type === "case_study" ? "Case study" : "Article"}</td>
                <td><span className={`adm-pill${p.status === "published" ? " live" : ""}`}>{p.status}</span></td>
                <td className="adm-muted">{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : ""}</td>
              </tr>
            ))}
            {!recent.length && <tr><td colSpan={4} className="adm-muted">No posts yet.</td></tr>}
          </tbody>
        </table>
      </section>
      <div className="adm-actions">
        <Link className="adm-btn" href="/admin/case-studies/new">+ New case study</Link>
        <Link className="adm-btn" href="/admin/articles/new">+ New article</Link>
      </div>
    </>
  );
}
