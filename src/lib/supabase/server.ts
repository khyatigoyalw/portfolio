import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
  return { url, key };
}

/**
 * Cookie-aware client for Server Components, Server Actions and Route Handlers.
 * Acts as the signed-in user, so RLS (is_admin()) applies. Reading cookies makes the
 * caller dynamic: use it for /admin only, never for the public pages.
 */
export async function createClient() {
  const { url, key } = env();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy refreshes the session.
        }
      },
    },
  });
}

/** Cookie-less anon client for public, cacheable reads (data-supabase.ts). RLS limits it to published content. */
export function createPublicClient() {
  const { url, key } = env();
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
