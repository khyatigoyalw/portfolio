/**
 * Read API used by the public pages. Picks Supabase when NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set, otherwise content/seed.json.
 *
 *   getSettings()                  -> SiteSettings
 *   getSections()                  -> visible sections, sorted (use getSection(key) for one)
 *   getPosts(type)                 -> published posts, sorted by sortOrder
 *   getPost(type, slug)            -> Post | null
 *   getAdjacentPosts(type, slug)   -> circular prev / next (same order as the home page)
 *   getMediaMap() / resolveMedia() -> media lookups for <Image>
 *
 * Admin screens must NOT use this (it hides drafts / hidden sections); they query Supabase
 * with the cookie client from ./supabase/server.
 */
import { cache } from "react";
import { hasSupabase, toResolvedMedia } from "./media-url";
import type { Media, Post, PostType, ResolvedMedia, Section, SectionKey, SectionOf, SiteSettings } from "./schema";

export { hasSupabase as isSupabaseMode } from "./media-url";

interface Source {
  getSettings(): Promise<SiteSettings>;
  getSections(): Promise<Section[]>;
  getPosts(type: PostType): Promise<Post[]>;
  getPost(type: PostType, slug: string): Promise<Post | null>;
  getMediaList(): Promise<Media[]>;
}

const source = (): Promise<Source> => (hasSupabase ? import("./data-supabase") : import("./data-local"));

export const getSettings = async () => (await source()).getSettings();
export const getSections = async () => (await source()).getSections();
export const getPosts = async (type: PostType) => (await source()).getPosts(type);
export const getPost = async (type: PostType, slug: string) => (await source()).getPost(type, slug);

export async function getSection<K extends SectionKey>(key: K): Promise<SectionOf<K> | null> {
  const found = (await getSections()).find((s) => s.key === key);
  return (found as SectionOf<K> | undefined) ?? null;
}

/** Previous/next published post of the same type, wrapping around at both ends. */
export async function getAdjacentPosts(type: PostType, slug: string): Promise<{ prev: Post | null; next: Post | null }> {
  const posts = await getPosts(type);
  const i = posts.findIndex((p) => p.slug === slug);
  if (i === -1 || posts.length < 2) return { prev: null, next: null };
  return { prev: posts[(i - 1 + posts.length) % posts.length], next: posts[(i + 1) % posts.length] };
}

/** id -> Media for every media row (memoised per request). */
export const getMediaMap = cache(async (): Promise<Map<string, Media>> => {
  const list = await (await source()).getMediaList();
  return new Map(list.map((m) => [m.id, m]));
});

/**
 * Resolve a media id to what <Image> needs: { src, width, height, alt, blurDataURL }.
 * Returns null for null/unknown ids. In local mode src = /media/<file>.
 * Pass `alt` to override the stored alt text for one usage.
 */
export async function resolveMedia(id: string | null | undefined, alt?: string): Promise<ResolvedMedia | null> {
  if (!id) return null;
  const m = (await getMediaMap()).get(id);
  if (!m) return null;
  const r = toResolvedMedia(m);
  return alt === undefined ? r : { ...r, alt };
}
