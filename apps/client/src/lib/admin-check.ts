import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabase } from "@portfolio/core/media-url";
import { createClient } from "@portfolio/core/supabase/server";

export type AdminState =
  | { status: "unconfigured" }
  | { status: "anon" }
  | { status: "forbidden"; email: string }
  | { status: "ok"; email: string; supabase: SupabaseClient };

/**
 * Minimal copy of the admin app's getAdmin(), used only by draft preview (/api/draft, data-preview.ts):
 * auth.getUser() validates the session JWT, then `select public.is_admin()` checks the admins table.
 * Memoised per request.
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
