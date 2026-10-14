"use server";

import { z } from "zod";
import { Media, MediaId } from "@/lib/schema";
import { mediaFromRow, mediaToRow } from "@/lib/mappers";
import { bust } from "@/lib/admin/revalidate";
import { findMediaReferences } from "@/lib/admin/queries";
import { check, guarded } from "./guard";

/** Row for a file the browser already uploaded to the `media` bucket. */
const Registered = z.object({
  path: z.string().min(1).max(300).regex(/^[a-z0-9][a-z0-9/_.-]*$/, "invalid storage path"),
  mime: z.string().min(1),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  bytes: z.number().int().nonnegative().nullable(),
  blurDataUrl: z.string().max(4000).nullable(),
  alt: z.string().default(""),
});

export async function registerMedia(input: unknown) {
  return guarded<{ media: Media }>(async (db) => {
    const r = Registered.parse(input);
    const media = Media.parse({ ...r, id: crypto.randomUUID() });
    const { data, error } = await db.from("media").insert(mediaToRow(media)).select("*").single();
    check(error, "Recording upload");
    bust({ media: true });
    return { media: mediaFromRow(data!), message: "Uploaded." };
  });
}

export async function updateMediaAlt(id: unknown, alt: unknown) {
  return guarded(async (db) => {
    const { error } = await db.from("media").update({ alt: z.string().max(500).parse(alt) }).eq("id", MediaId.parse(id));
    check(error, "Saving alt text");
    bust({ media: true, posts: true, sections: true, settings: true });
    return { message: "Alt text saved." };
  });
}

/** The browser uploaded the new file to a fresh path; point the row at it and remove the old object. */
export async function replaceMedia(id: unknown, input: unknown) {
  return guarded<{ media: Media }>(async (db) => {
    const mid = MediaId.parse(id);
    const r = Registered.omit({ alt: true }).parse(input);
    const prev = await db.from("media").select("path").eq("id", mid).single();
    check(prev.error, "Loading file");
    const { data, error } = await db
      .from("media")
      .update({ path: r.path, mime: r.mime, width: r.width, height: r.height, bytes: r.bytes, blur_data_url: r.blurDataUrl })
      .eq("id", mid)
      .select("*")
      .single();
    check(error, "Replacing file");
    if (prev.data!.path !== r.path) await db.storage.from("media").remove([prev.data!.path]);
    bust({ media: true, posts: true, sections: true, settings: true });
    return { media: mediaFromRow(data!), message: "File replaced everywhere it is used." };
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
    bust({ media: true });
    return { message: "Deleted." };
  });
}

export async function mediaReferences(id: unknown) {
  return guarded<{ refs: string[] }>(async (db) => ({ refs: await findMediaReferences(db, MediaId.parse(id)), message: "" }));
}
