import { z } from "zod";

/** Cache tags the public site understands (data-supabase.ts): settings, sections, media, posts, post:<type>:<slug>. */
export const REVALIDATE_TAG = /^(settings|sections|media|posts|post:(case_study|article):[a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** Body of POST <client>/api/revalidate, sent by the admin app. */
export const RevalidateBody = z.object({
  tags: z.array(z.string().regex(REVALIDATE_TAG, "unknown cache tag")).max(50),
});
export type RevalidateBody = z.infer<typeof RevalidateBody>;
