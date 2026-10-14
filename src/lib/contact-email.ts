// Server-only (reads secrets): import from Server Actions / Route Handlers, never from client components.
import { getSettings } from "@/lib/data";

export type ContactEnquiry = { name: string; email: string; phone?: string; message: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Emails the enquiry to the site owner through Resend. Returns true when Resend accepted it; false when skipped or failed. */
export async function sendContactEmail(m: ContactEnquiry): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const to = process.env.CONTACT_NOTIFY_EMAIL || (await getSettings()).contact.email;
  const from = process.env.CONTACT_FROM_EMAIL || "Portfolio <onboarding@resend.dev>";
  const inbox = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/admin/messages`;

  const text = [`Name: ${m.name}`, `Email: ${m.email}`, m.phone ? `Phone: ${m.phone}` : null, "", m.message, "", `Inbox: ${inbox}`]
    .filter((l) => l !== null)
    .join("\n");
  const html = `<p><b>Name:</b> ${esc(m.name)}<br><b>Email:</b> ${esc(m.email)}${m.phone ? `<br><b>Phone:</b> ${esc(m.phone)}` : ""}</p>
<p style="white-space:pre-wrap">${esc(m.message)}</p>
<p><a href="${esc(inbox)}">Open the inbox</a></p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, reply_to: m.email, subject: `New portfolio enquiry from ${m.name}`, text, html }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return true;
}
