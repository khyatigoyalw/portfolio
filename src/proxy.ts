import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16 "proxy" (formerly middleware). Runs for /admin/* only:
 * refreshes the Supabase session cookies and sends signed-out visitors to /admin/login.
 * This is just the first gate: pages and Server Actions re-check admin rights themselves.
 */
export async function proxy(request: NextRequest) {
  const { response, email, configured } = await updateSession(request);
  const { pathname } = request.nextUrl;
  // Without Supabase there is nothing to sign in to: /admin renders its "connect Supabase" notice.
  if (!configured) return response;
  if (!email && pathname !== "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (email && pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
