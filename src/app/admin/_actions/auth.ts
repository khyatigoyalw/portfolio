"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hasSupabase } from "@/lib/media-url";
import { createClient } from "@/lib/supabase/server";
import { guarded } from "./guard";

const credentials = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1) });

/** Email + password sign-in. Runs on the server so the session cookies are set here. For useActionState. */
export async function signIn(_prev: { error: string } | null, formData: FormData): Promise<{ error: string } | null> {
  if (!hasSupabase) return { error: "Supabase is not configured." };
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Wrong email or password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for every failure so it never reveals whether the email exists.
  if (error) return { error: "Wrong email or password." };
  redirect("/admin");
}

const passwordChange = z
  .object({ newPassword: z.string().min(10).max(72), confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords do not match." });

export async function changePassword(input: unknown) {
  return guarded(async (db) => {
    const { newPassword } = passwordChange.parse(input);
    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { message: "Password updated." };
  });
}

export async function signOut() {
  if (hasSupabase) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
