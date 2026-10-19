import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { RevalidateBody } from "@portfolio/core/revalidate";

export const dynamic = "force-dynamic";

/** Constant-time check of `Authorization: Bearer <REVALIDATE_SECRET>`; false when the secret is not configured. */
function authorised(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] ?? "");
  const want = Buffer.from(secret);
  return given.length === want.length && timingSafeEqual(given, want);
}

/**
 * Called by the admin app after every publish: drops the tagged caches (data-supabase.ts) so the next
 * visitor request re-reads Supabase.   POST { tags: ["settings", "post:article:my-slug", …] }
 */
export async function POST(request: NextRequest) {
  if (!authorised(request)) return new NextResponse("Unauthorized", { status: 401 });

  const body = RevalidateBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });

  for (const tag of body.data.tags) revalidateTag(tag, { expire: 0 }); // edits must show immediately
  revalidatePath("/", "layout"); // home page, static params and sitemap read all of the tags
  return NextResponse.json({ revalidated: body.data.tags });
}
