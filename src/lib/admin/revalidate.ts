import { revalidatePath, revalidateTag } from "next/cache";
import type { PostType } from "@/lib/schema";

const now = { expire: 0 } as const; // admin edits must show on the public site immediately

/** Invalidate public caches. Tags match data-supabase.ts: settings, sections, posts, post:<type>:<slug>, media. */
export function bust(what: {
  settings?: boolean;
  sections?: boolean;
  media?: boolean;
  posts?: boolean;
  post?: { type: PostType; slug: string }[];
}) {
  if (what.settings) revalidateTag("settings", now);
  if (what.sections) revalidateTag("sections", now);
  if (what.media) revalidateTag("media", now);
  if (what.posts) revalidateTag("posts", now);
  for (const p of what.post ?? []) revalidateTag(`post:${p.type}:${p.slug}`, now);
  // Home page (and its static params / sitemap) read all of the above.
  revalidatePath("/", "layout");
}
