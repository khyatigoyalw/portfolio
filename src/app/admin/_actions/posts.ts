"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Post, PostStatus, PostType } from "@/lib/schema";
import { postToRow } from "@/lib/mappers";
import { bust } from "@/lib/admin/revalidate";
import { check, guarded } from "./guard";

/** What the editor sends: a Post without the columns the database / server owns. */
const PostInput = Post.omit({ id: true, sortOrder: true, publishedAt: true, createdAt: true, updatedAt: true }).extend({
  id: z.string().uuid().nullable(),
});

const SORT_STEP = 10;

/** Keep the home page's gallery / writing lists pointing at the right slug after a rename or delete. */
async function rewriteSlugRefs(db: SupabaseClient, type: z.infer<typeof PostType>, from: string, to: string | null) {
  const key = type === "case_study" ? "gallery" : "writing";
  const { data } = await db.from("sections").select("key,content").eq("key", key).maybeSingle();
  if (!data) return;
  const content = data.content as { tiles?: { slug: string }[]; slugs?: string[] };
  let changed = false;
  if (key === "gallery" && content.tiles) {
    const next = content.tiles.flatMap((t) => (t.slug !== from ? [t] : to ? [{ ...t, slug: to }] : []));
    changed = next.length !== content.tiles.length || next.some((t, i) => t !== content.tiles![i]);
    content.tiles = next;
  }
  if (key === "writing" && content.slugs) {
    const next = content.slugs.flatMap((s) => (s !== from ? [s] : to ? [to] : []));
    changed = next.join("|") !== content.slugs.join("|");
    content.slugs = next;
  }
  if (changed) check((await db.from("sections").update({ content }).eq("key", key)).error, "Updating home page references");
}

/** On a post's first publish, add it to the end of the home page's gallery / writing list so it shows up there. */
async function listOnHome(db: SupabaseClient, type: z.infer<typeof PostType>, slug: string) {
  const key = type === "case_study" ? "gallery" : "writing";
  const { data } = await db.from("sections").select("content").eq("key", key).maybeSingle();
  if (!data) return;
  const content = data.content as { tiles?: { slug: string }[]; slugs?: string[] };
  if (key === "gallery") {
    if (content.tiles?.some((t) => t.slug === slug)) return;
    content.tiles = [...(content.tiles ?? []), { slug, title: null, label: null, variant: "default" } as { slug: string }];
  } else {
    if (content.slugs?.includes(slug)) return;
    content.slugs = [...(content.slugs ?? []), slug];
  }
  check((await db.from("sections").update({ content }).eq("key", key)).error, "Adding to the home page");
}

export async function savePost(input: unknown) {
  return guarded<{ id: string; slug: string }>(async (db) => {
    const data = PostInput.parse(input);
    const isNew = !data.id;
    const id = data.id ?? crypto.randomUUID();

    // slug must be unique within its type
    const clash = await db.from("posts").select("id").eq("type", data.type).eq("slug", data.slug).neq("id", id).maybeSingle();
    check(clash.error, "Checking slug");
    if (clash.data) throw new Error(`The slug “${data.slug}” is already used by another ${data.type === "case_study" ? "case study" : "article"}.`);

    let sortOrder = SORT_STEP;
    let oldSlug: string | null = null;
    let oldType = data.type;
    let wasPublished = false;
    if (isNew) {
      const last = await db.from("posts").select("sort_order").eq("type", data.type).order("sort_order", { ascending: false }).limit(1).maybeSingle();
      sortOrder = (last.data?.sort_order ?? 0) + SORT_STEP;
    } else {
      const prev = await db.from("posts").select("slug,type,sort_order,published_at").eq("id", id).single();
      check(prev.error, "Loading post");
      sortOrder = prev.data!.sort_order;
      wasPublished = prev.data!.published_at !== null;
      oldSlug = prev.data!.slug;
      oldType = prev.data!.type;
      if (oldType !== data.type) throw new Error("A post's type cannot be changed.");
    }

    const post = Post.parse({ ...data, id, sortOrder, publishedAt: null });
    const { published_at: _omit, ...row } = postToRow(post); // published_at is stamped by the trigger
    void _omit;
    const { error } = await db.from("posts").upsert(row);
    check(error, "Saving post");

    if (oldSlug && oldSlug !== post.slug) await rewriteSlugRefs(db, post.type, oldSlug, post.slug);
    if (post.status === "published" && !wasPublished) await listOnHome(db, post.type, post.slug);
    const tags = [{ type: post.type, slug: post.slug }, ...(oldSlug && oldSlug !== post.slug ? [{ type: post.type, slug: oldSlug }] : [])];
    bust({ posts: true, sections: true, media: true, post: tags });
    return {
      id,
      slug: post.slug,
      message: isNew ? "Created." : post.status === "published" ? "Saved. Live on the site." : "Saved as draft.",
    };
  });
}

export async function setPostStatus(id: unknown, status: unknown) {
  return guarded(async (db) => {
    const pid = z.string().uuid().parse(id);
    const st = PostStatus.parse(status);
    const before = await db.from("posts").select("published_at").eq("id", pid).single();
    check(before.error, "Loading post");
    const { data, error } = await db.from("posts").update({ status: st }).eq("id", pid).select("type,slug").single();
    check(error, "Updating status");
    if (st === "published" && before.data!.published_at === null) await listOnHome(db, data!.type, data!.slug);
    bust({ posts: true, sections: true, post: [{ type: data!.type, slug: data!.slug }] });
    return { message: st === "published" ? "Published." : "Unpublished (now a draft)." };
  });
}

export async function deletePost(id: unknown) {
  return guarded(async (db) => {
    const pid = z.string().uuid().parse(id);
    const { data, error } = await db.from("posts").delete().eq("id", pid).select("type,slug,title").single();
    check(error, "Deleting post");
    await rewriteSlugRefs(db, data!.type, data!.slug, null);
    bust({ posts: true, sections: true, post: [{ type: data!.type, slug: data!.slug }] });
    return { message: `Deleted “${data!.title}”.` };
  });
}

/** ids in display order -> sort_order 10, 20, 30… (only the ids of one type are sent). */
export async function reorderPosts(type: unknown, ids: unknown) {
  return guarded(async (db) => {
    const t = PostType.parse(type);
    const list = z.array(z.string().uuid()).parse(ids);
    for (const [i, id] of list.entries()) {
      const { error } = await db.from("posts").update({ sort_order: (i + 1) * SORT_STEP }).eq("id", id).eq("type", t);
      check(error, "Reordering");
    }
    bust({ posts: true, sections: true });
    return { message: "Order saved." };
  });
}
