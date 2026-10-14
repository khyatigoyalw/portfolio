import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabase } from "@/lib/media-url";
import { createClient } from "@/lib/supabase/server";

export type AdminState =
  | { status: "unconfigured" }
  | { status: "anon" }
  | { status: "forbidden"; email: string }
  | { status: "ok"; email: string; supabase: SupabaseClient };

/**
 * Who is calling, verified server-side:
 *  1. auth.getUser() validates the session JWT with Supabase Auth (not just the cookie),
 *  2. `select public.is_admin()` (rpc) asks the database whether that email is in `admins`.
 * Memoised per request. Every admin page and every Server Action goes through this
 * (layouts alone are not enough: they render in parallel with pages and never run for actions).
 */
export const getAdmin = cache(async (): Promise<AdminState> => {
  if (!hasSupabase) return { status: "unconfigured" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return { status: "anon" };
  const email = data.user.email.toLowerCase();
  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError || isAdmin !== true) return { status: "forbidden", email };
  return { status: "ok", email, supabase: supabase as unknown as SupabaseClient };
});
