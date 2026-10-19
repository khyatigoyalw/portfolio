"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Media, MediaId } from "@portfolio/core/schema";
import { mediaFromRow, mediaToRow } from "@portfolio/core/mappers";
import { optimise } from "@/lib/optimise";
import { bust, bustWarning } from "@/lib/revalidate";
import { findMediaReferences } from "@/lib/queries";
import { check, guarded } from "./guard";

const PATH = z.string().min(1).max(300).regex(/^[a-z0-9][a-z0-9/_.-]*$/, "invalid storage path");

/** A file the browser already uploaded to `incoming/` in the `media` bucket; the server optimises and moves it. */
const Incoming = z.object({
  incomingPath: PATH.refine((p) => p.startsWith("incoming/") && !p.includes(".."), "must be under incoming/"),
  mime: z.string().min(1),
});
const Registered = Incoming.extend({ alt: z.string().default("") });

/** Download the incoming upload, optimise it and store the result under uploads/. Returns the new row fields. */
async function ingest(db: SupabaseClient, r: z.infer<typeof Incoming>) {
  const dl = await db.storage.from("media").download(r.incomingPath);
  if (dl.error || !dl.data) throw new Error(`Reading upload: ${dl.error?.message ?? "file not found"}`);
  const original = Buffer.from(await dl.data.arrayBuffer());
  const out = await optimise(original, r.mime);

  const base = r.incomingPath.split("/").pop()!.replace(/^[a-z0-9]+-/, "").replace(/\.[a-z0-9]+$/, "") || "file";
  const path = `uploads/${Date.now().toString(36)}-${base}.${out.ext}`;
  const up = await db.storage.from("media").upload(path, out.buffer, { contentType: out.mime, cacheControl: "31536000" });
  if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
  await db.storage.from("media").remove([r.incomingPath]); // best effort

  return {
    path,
    mime: out.mime,
    width: out.width,
    height: out.height,
    bytes: out.buffer.length,
    blurDataUrl: out.blurDataUrl,
    originalBytes: original.length,
  };
}

export async function registerMedia(input: unknown) {
  return guarded<{ media: Media }>(async (db) => {
    const r = Registered.parse(input);
    const media = Media.parse({ ...(await ingest(db, r)), alt: r.alt, id: crypto.randomUUID() });
    const { data, error } = await db.from("media").insert(mediaToRow(media)).select("*").single();
    if (error) await db.storage.from("media").remove([media.path]);
    check(error, "Recording upload");
    const live = bustWarning(await bust({ media: true }));
    return { ...live, media: mediaFromRow(data!), message: "Uploaded." };
  });
}

export async function updateMediaAlt(id: unknown, alt: unknown) {
  return guarded(async (db) => {
    const { error } = await db.from("media").update({ alt: z.string().max(500).parse(alt) }).eq("id", MediaId.parse(id));
    check(error, "Saving alt text");
    const live = bustWarning(await bust({ media: true, posts: true, sections: true, settings: true }));
    return { ...live, message: "Alt text saved." };
  });
}

/** The browser uploaded the new file to incoming/; optimise it, point the row at the result and remove the old object. */
export async function replaceMedia(id: unknown, input: unknown) {
  return guarded<{ media: Media }>(async (db) => {
    const mid = MediaId.parse(id);
    const r = Incoming.parse(input);
    const prev = await db.from("media").select("path").eq("id", mid).single();
    check(prev.error, "Loading file");
    const f = await ingest(db, r);
    const { data, error } = await db
      .from("media")
      .update({ path: f.path, mime: f.mime, width: f.width, height: f.height, bytes: f.bytes, blur_data_url: f.blurDataUrl, original_bytes: f.originalBytes })
      .eq("id", mid)
      .select("*")
      .single();
    if (error) await db.storage.from("media").remove([f.path]);
    check(error, "Replacing file");
    if (prev.data!.path !== f.path) await db.storage.from("media").remove([prev.data!.path]);
    const live = bustWarning(await bust({ media: true, posts: true, sections: true, settings: true }));
    return { ...live, media: mediaFromRow(data!), message: "File replaced everywhere it is used." };
  });
}

/** Blocked while anything references the file. */
export async function deleteMedia(id: unknown) {
  return guarded(async (db) => {
    const mid = MediaId.parse(id);
    const refs = await findMediaReferences(db, mid);
    if (refs.length) throw new Error(`Still in use, not deleted:\n${refs.slice(0, 6).join("\n")}`);
    const { data, error } = await db.from("media").delete().eq("id", mid).select("path").single();
    check(error, "Deleting file");
    await db.storage.from("media").remove([data!.path]);
    const live = bustWarning(await bust({ media: true }));
    return { ...live, message: "Deleted." };
  });
}

export async function mediaReferences(id: unknown) {
  return guarded<{ refs: string[] }>(async (db) => ({ refs: await findMediaReferences(db, MediaId.parse(id)), message: "" }));
}
