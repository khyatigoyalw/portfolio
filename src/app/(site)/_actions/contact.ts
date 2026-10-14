"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { sendContactEmail } from "@/lib/contact-email";
import { hasSupabase } from "@/lib/media-url";
import { createPublicClient } from "@/lib/supabase/server";

export type ContactResult = { ok: true } | { ok: false; error: string };

const Input = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120, "Name is too long."),
  email: z.string().trim().min(3, "Please enter your email.").max(200, "Email is too long.").email("That email address doesn't look right."),
  phone: z.string().trim().max(40, "Phone number is too long.").optional(),
  message: z.string().trim().min(1, "Please write a message.").max(5000, "Message is too long (5000 characters max)."),
  company: z.string().max(0), // honeypot: real visitors never see or fill it
});

const SALT = "portfolio-contact-v1";

export async function submitContact(_prev: ContactResult | null, form: FormData): Promise<ContactResult> {
  const parsed = Input.safeParse({
    name: form.get("name") ?? "",
    email: form.get("email") ?? "",
    phone: form.get("phone") || undefined,
    message: form.get("message") ?? "",
    company: form.get("company") ?? "",
  });
  if (!parsed.success) {
    // Honeypot filled: pretend it worked, store nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "company")) return { ok: true };
    return { ok: false, error: parsed.error.issues[0].message };
  }
  if (!hasSupabase) return { ok: false, error: "The contact form isn't available right now. Please email me directly." };

  const { name, email, phone, message } = parsed.data;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  const ipHash = ip ? createHash("sha256").update(SALT + ip).digest("hex") : null;

  const db = createPublicClient();
  const { data: id, error } = await db.rpc("submit_contact_message", {
    p_name: name,
    p_email: email,
    p_phone: phone ?? null,
    p_message: message,
    p_ip_hash: ipHash,
  });
  if (error) {
    console.error("submit_contact_message failed:", error.message);
    return { ok: false, error: error.message.startsWith("Too many") ? error.message : "Sorry, something went wrong. Please email me directly." };
  }

  // Email is best-effort: the message is already stored.
  try {
    if (await sendContactEmail({ name, email, phone, message })) {
      const { error: markError } = await db.rpc("mark_contact_email_sent", { p_id: id });
      if (markError) console.error("mark_contact_email_sent failed:", markError.message);
    }
  } catch (e) {
    console.error("Contact email failed:", e);
  }
  return { ok: true };
}
