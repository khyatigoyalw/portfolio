import type { PostType } from "@portfolio/core/schema";

export type BustResult = { ok: true } | { ok: false; error: string };

/**
 * Ask the public site (a separate deployment) to drop its caches: POST <client>/api/revalidate with a
 * shared secret. Tags match data-supabase.ts: settings, sections, posts, post:<type>:<slug>, media.
 * Never throws; callers keep their successful DB write and surface a failure as a warning (see withBust).
 */
export async function bust(what: {
  settings?: boolean;
  sections?: boolean;
  media?: boolean;
  posts?: boolean;
  post?: { type: PostType; slug: string }[];
}): Promise<BustResult> {
  const base = process.env.NEXT_PUBLIC_CLIENT_URL?.replace(/\/$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return { ok: false, error: "Live site refresh is not configured" };

  const tags: string[] = [];
  if (what.settings) tags.push("settings");
  if (what.sections) tags.push("sections");
  if (what.media) tags.push("media");
  if (what.posts) tags.push("posts");
  for (const p of what.post ?? []) tags.push(`post:${p.type}:${p.slug}`);

  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({ tags }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, error: `the site answered ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === "TimeoutError" ? "timed out" : e instanceof Error ? e.message : "request failed" };
  }
}

/** Result fragment for an action that already wrote to the database: a warning when the refresh failed. */
export function bustWarning(r: BustResult): { warning?: string } {
  return r.ok ? {} : { warning: `Saved, but the live site could not be refreshed: ${r.error}.` };
}
