import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth cookies on each request and reports who is signed in.
 * Call from src/proxy.ts (Next 16's name for middleware.ts):
 *
 *   const { response, email } = await updateSession(request);
 *   if (!email) return NextResponse.redirect(new URL("/admin/login", request.url));
 *   return response;
 *
 * `email` is the verified JWT email claim, NOT proof of admin rights; admin writes are
 * enforced by RLS (is_admin()), and pages should additionally check the admins table.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { response, email: null as string | null, configured: false };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : null;
  return { response, email, configured: true };
}
