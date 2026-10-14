import { getAdmin } from "@/lib/admin/auth";
import type { ActionResult } from "@/lib/admin/result";
import { formatZod } from "@/lib/admin/result";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ZodError } from "zod";

/**
 * Wraps a Server Action body: re-checks, on the server and on every call, that the caller is a
 * signed-in admin (auth.getUser() + rpc is_admin()), then converts thrown errors to a result.
 * (Not a "use server" file, so it is never callable from the browser itself.)
 */
export async function guarded<T extends object = object>(
  fn: (db: SupabaseClient, email: string) => Promise<{ message: string } & T>,
): Promise<ActionResult<T>> {
  const admin = await getAdmin();
  if (admin.status === "unconfigured") return { ok: false, error: "Supabase is not configured; the admin is read-only." };
  if (admin.status !== "ok") return { ok: false, error: "Not authorised." };
  try {
    const out = await fn(admin.supabase, admin.email);
    return { ok: true, ...out } as ActionResult<T>;
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: formatZod(e) };
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Throws a friendly Error from a Supabase response. */
export function check(error: { message: string; code?: string } | null, what: string) {
  if (!error) return;
  if (error.code === "23505") throw new Error(`${what}: that value is already taken.`);
  if (error.code === "42501") throw new Error(`${what}: permission denied (is your email in the admins table?).`);
  throw new Error(`${what}: ${error.message}`);
}
