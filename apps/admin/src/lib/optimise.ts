import sharp, { type Metadata } from "sharp";

const MAX_EDGE = 2560;
const RASTER = new Set(["jpeg", "png", "webp", "avif", "heif", "tiff", "gif"]); // gif here = single-frame only
const KEEPABLE = new Set(["jpeg", "png", "webp"]); // formats a browser serves as-is
const EXT: Record<string, { mime: string; ext: string }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
};
const EXT_BY_MIME: Record<string, string> = { "image/gif": "gif", "image/svg+xml": "svg", "application/pdf": "pdf", "image/avif": "avif" };

export type Optimised = { buffer: Buffer; mime: string; ext: string; width: number | null; height: number | null; blurDataUrl: string | null };

/** ~12px-wide JPEG data URL used as the <Image> placeholder (same as the old browser-side code). */
async function blur(input: Buffer): Promise<string | null> {
  try {
    const out = await sharp(input).rotate().resize({ width: 12 }).jpeg({ quality: 60 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Server-side image pipeline for uploads.
 * - Raster images: EXIF-rotate, fit inside 2560x2560 (never enlarge), WebP q80, metadata stripped. If that is not
 *   smaller and the original is already a web format within the size limit, the original bytes are kept.
 * - Animated GIF, SVG, PDF, anything else: bytes unchanged; dimensions read where sharp can.
 */
export async function optimise(input: Buffer, mime: string): Promise<Optimised> {
  const kept = async (m: Metadata | null, withBlur: boolean): Promise<Optimised> => ({
    buffer: input,
    mime,
    ext: EXT_BY_MIME[mime] ?? mime.split("/")[1]?.replace(/[^a-z0-9]/g, "") ?? "bin",
    width: m?.width ?? null,
    height: m?.height ?? null,
    blurDataUrl: withBlur ? await blur(input) : null,
  });

  if (mime === "application/pdf") return kept(null, false);

  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    if (mime === "image/svg+xml") return kept(null, false);
    throw new Error("That file could not be read as an image.");
  }
  const format = meta.format ?? "";

  if (mime === "image/svg+xml" || format === "svg") return kept(meta, false);
  if (format === "gif" && (meta.pages ?? 1) > 1) return kept(meta, true);
  if (!RASTER.has(format)) return kept(meta, false);

  // Display size: EXIF orientations 5-8 swap the axes.
  const swap = (meta.orientation ?? 1) >= 5;
  const srcW = (swap ? meta.height : meta.width) ?? 0;
  const srcH = (swap ? meta.width : meta.height) ?? 0;

  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  const alreadyFine = KEEPABLE.has(format) && (meta.orientation ?? 1) === 1 && Math.max(srcW, srcH) <= MAX_EDGE;
  if (data.length >= input.length && alreadyFine) {
    return { buffer: input, ...EXT[format], width: srcW, height: srcH, blurDataUrl: await blur(input) };
  }
  return { buffer: data, mime: "image/webp", ext: "webp", width: info.width, height: info.height, blurDataUrl: await blur(data) };
}
