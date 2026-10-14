/**
 * Supabase data source for the public site. Uses the cookie-less anon client, so Row Level
 * Security limits results to published posts / visible sections; every read is wrapped in
 * unstable_cache with tags so admin Server Actions can `revalidateTag(...)` after a write.
 *
 * Tags: "settings", "sections", "posts", "post:<type>:<slug>", "media"
 */
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/server";
import { mediaFromRow, postFromRow, sectionFromRow, settingsFromRow } from "./mappers";
import type { Media, Post, PostType, Section, SiteSettings } from "./schema";

const fail = (what: string, error: { message: string }) => new Error(`Supabase: failed to load ${what}: ${error.message}`);

export const getSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const { data, error } = await createPublicClient().from("site_settings").select("*").eq("id", 1).single();
    if (error) throw fail("site_settings", error);
    return settingsFromRow(data);
  },
  ["settings"],
  { tags: ["settings"] },
);

export const getSections = unstable_cache(
  async (): Promise<Section[]> => {
    const { data, error } = await createPublicClient().from("sections").select("*").order("sort_order");
    if (error) throw fail("sections", error);
    return data.map(sectionFromRow);
  },
  ["sections"],
  { tags: ["sections"] },
);

export const getPosts = (type: PostType): Promise<Post[]> =>
  unstable_cache(
    async (): Promise<Post[]> => {
      const { data, error } = await createPublicClient()
        .from("posts")
        .select("*")
        .eq("type", type)
        .eq("status", "published")
        .order("sort_order");
      if (error) throw fail(`posts (${type})`, error);
      return data.map(postFromRow);
    },
    ["posts", type],
    { tags: ["posts"] },
  )();

export const getPost = (type: PostType, slug: string): Promise<Post | null> =>
  unstable_cache(
    async (): Promise<Post | null> => {
      const { data, error } = await createPublicClient()
        .from("posts")
        .select("*")
        .eq("type", type)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw fail(`post ${type}/${slug}`, error);
      return data ? postFromRow(data) : null;
    },
    ["post", type, slug],
    { tags: ["posts", `post:${type}:${slug}`] },
  )();

export const getMediaList = unstable_cache(
  async (): Promise<Media[]> => {
    const { data, error } = await createPublicClient().from("media").select("*");
    if (error) throw fail("media", error);
    return data.map(mediaFromRow);
  },
  ["media"],
  { tags: ["media"] },
);
