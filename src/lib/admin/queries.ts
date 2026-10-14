import type { SupabaseClient } from "@supabase/supabase-js";
import { mediaFromRow, postFromRow, sectionFromRow, settingsFromRow } from "@/lib/mappers";
import type { Media, Post, PostType, Section, SiteSettings } from "@/lib/schema";

/** Admin reads: run as the signed-in admin, so drafts and hidden sections are included. */
const must = <T,>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`Failed to load ${what}: ${r.error.message}`);
  return r.data as T;
};

export async function loadSettings(db: SupabaseClient): Promise<SiteSettings> {
  return settingsFromRow(must(await db.from("site_settings").select("*").eq("id", 1).single(), "settings"));
}

export async function loadSections(db: SupabaseClient): Promise<Section[]> {
  return must(await db.from("sections").select("*").order("sort_order"), "sections").map(sectionFromRow);
}

export async function loadPosts(db: SupabaseClient, type?: PostType): Promise<Post[]> {
  let q = db.from("posts").select("*").order("sort_order").order("created_at");
  if (type) q = q.eq("type", type);
  return must(await q, "posts").map(postFromRow);
}

export async function loadPost(db: SupabaseClient, id: string): Promise<Post | null> {
  const { data, error } = await db.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load post: ${error.message}`);
  return data ? postFromRow(data) : null;
}

export async function loadMedia(db: SupabaseClient): Promise<Media[]> {
  return must(await db.from("media").select("*").order("created_at", { ascending: false }), "media").map(mediaFromRow);
}

/** Where a media id is used (settings résumé, post covers, post image blocks, section content). */
export async function findMediaReferences(db: SupabaseClient, id: string): Promise<string[]> {
  const refs: string[] = [];
  const [settings, posts, sections] = await Promise.all([
    db.from("site_settings").select("resume_media_id").eq("id", 1).maybeSingle(),
    db.from("posts").select("id,title,type,cover_media_id,body"),
    db.from("sections").select("key,content"),
  ]);
  if (settings.data?.resume_media_id === id) refs.push("Résumé file (Profile & settings)");
  for (const p of posts.data ?? []) {
    const where = `${p.type === "case_study" ? "Case study" : "Article"} “${p.title}”`;
    if (p.cover_media_id === id) refs.push(`${where} (cover)`);
    else if (JSON.stringify(p.body ?? []).includes(id)) refs.push(`${where} (body)`);
  }
  for (const s of sections.data ?? []) if (JSON.stringify(s.content ?? {}).includes(id)) refs.push(`Home section “${s.key}”`);
  return refs;
}
