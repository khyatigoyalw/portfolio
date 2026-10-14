import Image from "next/image";
import type { ResolvedMedia } from "@/lib/schema";

/** next/image for a resolved media row (width/height + blur placeholder when available). */
export function MediaImage({
  media,
  alt,
  className,
  sizes,
  priority,
}: {
  media: ResolvedMedia | null;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!media || !media.width || !media.height) return null;
  return (
    <Image
      className={className}
      src={media.src}
      width={media.width}
      height={media.height}
      alt={alt ?? media.alt}
      sizes={sizes}
      priority={priority}
      placeholder={media.blurDataURL ? "blur" : "empty"}
      blurDataURL={media.blurDataURL}
    />
  );
}
