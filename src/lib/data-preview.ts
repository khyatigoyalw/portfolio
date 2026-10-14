/**
 * Draft preview for the public post pages (admin Preview button).
 *
 * In a post page:
 *   const { isEnabled } = await draftMode();
 *   const post = (isEnabled && (await getPostForPreview(type, slug))) || (await getPost(type, slug));
 *
 * Reads with the visitor's cookie session and re-checks is_admin(), so drafts are only ever
 * returned to a signed-in admin; anyone else gets null (fall back to the published post).
 * Never cached. Only works in Supabase mode (returns null otherwise).
 */
import { getAdmin } from "./admin/auth";
import { postFromRow } from "./mappers";
import type { Post, PostType } from "./schema";

export async function getPostForPreview(type: PostType, slug: string): Promise<Post | null> {
  const admin = await getAdmin();
  if (admin.status !== "ok") return null;
  const { data } = await admin.supabase.from("posts").select("*").eq("type", type).eq("slug", slug).maybeSingle();
  return data ? postFromRow(data) : null;
}
