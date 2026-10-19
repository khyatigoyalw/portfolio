import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/data-preview";
import { postFromRow } from "@portfolio/core/mappers";
import { hasSupabase } from "@portfolio/core/media-url";
import { createPublicClient } from "@portfolio/core/supabase/server";

export const dynamic = "force-dynamic";

const PATHS = { case_study: "/case-studies", article: "/articles" } as const;

/**
 * Preview entry point. The admin app's Preview button creates a one-time token (1 hour) and opens
 *   /api/draft?token=<token>             enable Draft Mode + set the preview_token cookie, redirect to the post
 *   /api/draft?disable=1[&redirect=/path] leave Draft Mode and clear the cookie
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const draft = await draftMode();

  if (q.get("disable")) {
    draft.disable();
    const back = q.get("redirect");
    const res = NextResponse.redirect(new URL(back?.startsWith("/") && !back.startsWith("//") ? back : "/", request.url));
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }

  const token = q.get("token");
  const expired = () => new NextResponse("Preview link expired", { status: 401 });
  if (!token || !hasSupabase) return expired();

  const { data } = await createPublicClient().rpc("preview_post", { p_token: token });
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return expired();
  const post = postFromRow(row);

  draft.enable();
  const res = NextResponse.redirect(new URL(`${PATHS[post.type]}/${post.slug}`, request.url));
  res.cookies.set(PREVIEW_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 });
  return res;
}
