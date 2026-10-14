import type { Media, ResolvedMedia } from "./schema";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the site reads/writes Supabase; false = local content/seed.json mode. */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** Public URL of a media file: Supabase storage when configured, else /media/<path> from public/. */
export function mediaUrl(path: string): string {
  return hasSupabase
    ? `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/media/${encodePath(path)}`
    : `/media/${encodePath(path)}`;
}

/** Shape expected by next/image (width/height are null for non-images such as the résumé PDF). */
export function toResolvedMedia(m: Media): ResolvedMedia {
  return {
    src: mediaUrl(m.path),
    width: m.width,
    height: m.height,
    alt: m.alt,
    blurDataURL: m.blurDataUrl ?? undefined,
  };
}
