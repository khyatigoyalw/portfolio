import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { PostType } from "@/lib/schema";
import { Post } from "@/lib/schema";

export const dynamic = "force-dynamic";

const PATHS = { case_study: "/case-studies", article: "/articles" } as const;

/**
 * Preview entry point (admins only).
 *   /api/draft?type=case_study|article&slug=<slug>   enable Draft Mode, then redirect to the page
 *   /api/draft?disable=1[&redirect=/admin]            leave Draft Mode
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const draft = await draftMode();

  if (q.get("disable")) {
    draft.disable();
    const back = q.get("redirect");
    return NextResponse.redirect(new URL(back?.startsWith("/") && !back.startsWith("//") ? back : "/", request.url));
  }

  if ((await getAdmin()).status !== "ok") return new NextResponse("Not authorised", { status: 401 });

  const type = PostType.safeParse(q.get("type"));
  const slug = Post.shape.slug.safeParse(q.get("slug"));
  if (!type.success || !slug.success) return new NextResponse("Bad type or slug", { status: 400 });

  draft.enable();
  return NextResponse.redirect(new URL(`${PATHS[type.data]}/${slug.data}`, request.url));
}
