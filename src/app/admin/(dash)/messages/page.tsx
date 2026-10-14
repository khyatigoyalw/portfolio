import type { Metadata } from "next";
import { gate } from "@/components/admin/gate";
import { MessageActions } from "@/components/admin/message-actions";
import { loadMessages, recentMessages } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Messages" };

export default async function Page() {
  const g = await gate();
  if (!g.ok) return g.view;
  const messages = await loadMessages(g.db);
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Messages</h1>
          <p>Enquiries from the contact form on the site.</p>
        </div>
      </div>
      <div className="adm-stats">
        <div className="adm-stat"><b>{messages.length}</b><span>Total</span></div>
        <div className="adm-stat"><b>{messages.filter((m) => m.status === "new").length}</b><span>New</span></div>
        <div className="adm-stat"><b>{recentMessages(messages)}</b><span>Last 7 days</span></div>
      </div>
      {messages.map((m) => (
        <section key={m.id} className="adm-card">
          <h2>
            {m.name} <span className={`adm-pill${m.status === "new" ? " live" : ""}`}>{m.status}</span>
          </h2>
          <p className="adm-muted" style={{ fontSize: 13 }}>
            <a href={`mailto:${m.email}`}>{m.email}</a>
            {m.phone ? ` · ${m.phone}` : ""} · {new Date(m.createdAt).toLocaleString()} · {m.emailSent ? "Email notification sent" : "No email notification"}
          </p>
          <p style={{ whiteSpace: "pre-wrap", margin: "12px 0 16px" }}>{m.message}</p>
          <MessageActions id={m.id} status={m.status} name={m.name} />
        </section>
      ))}
      {!messages.length && <p className="adm-muted">No messages yet.</p>}
    </>
  );
}
