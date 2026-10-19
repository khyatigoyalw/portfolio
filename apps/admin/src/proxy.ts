import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@portfolio/core/supabase/middleware";

/**
 * Next 16 "proxy" (formerly middleware). Runs for every page except /login, /auth/callback and static files:
 * refreshes the Supabase session cookies and sends signed-out visitors to /login.
 * This is just the first gate: pages and Server Actions re-check admin rights themselves.
 */
export async function proxy(request: NextRequest) {
  const { response, email, configured } = await updateSession(request);
  const { pathname } = request.nextUrl;
  // Without Supabase there is nothing to sign in to: the app renders its "connect Supabase" notice.
  if (!configured) return response;
  if (!email && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (email && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/|auth/callback|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml|woff2?)$).*)"],
};
