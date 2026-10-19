/**
 * Draft preview for the public post pages (admin Preview button).
 *
 * In a post page:
 *   const { isEnabled } = await draftMode();
 *   const post = (isEnabled && (await getPostForPreview(type, slug))) || (await getPost(type, slug));
 *
 * /api/draft exchanges the one-time token from the admin app for Draft Mode plus a `preview_token` cookie.
 * Here that token goes to the preview_post() RPC (security definer, expires after an hour), so drafts are
 * only ever returned for a live token; anyone else gets null (fall back to the published post).
 * No Supabase auth session is involved. Never cached. Only works in Supabase mode (returns null otherwise).
 */
import { cookies } from "next/headers";
import { postFromRow } from "@portfolio/core/mappers";
import { hasSupabase } from "@portfolio/core/media-url";
import type { Post, PostType } from "@portfolio/core/schema";
import { createPublicClient } from "@portfolio/core/supabase/server";

export const PREVIEW_COOKIE = "preview_token";

export async function getPostForPreview(type: PostType, slug: string): Promise<Post | null> {
  if (!hasSupabase) return null;
  const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (!token) return null;
  const { data } = await createPublicClient().rpc("preview_post", { p_token: token });
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  const post = postFromRow(row);
  return post.type === type && post.slug === slug ? post : null;
}
