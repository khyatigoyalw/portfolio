import Link from "next/link";
import { getPosts, resolveMedia } from "@/lib/data";
import type { SectionOf } from "@/lib/schema";
import { MediaImage } from "./media-image";
import { SectionHead, SectionShell } from "./section-head";

export async function Gallery({ section }: { section: SectionOf<"gallery"> }) {
  const posts = new Map((await getPosts("case_study")).map((p) => [p.slug, p]));
  const tiles = (
    await Promise.all(
      section.content.tiles.map(async (t) => {
        const post = posts.get(t.slug);
        if (!post) return null;
        return { t, post, cover: await resolveMedia(post.coverMediaId) };
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <SectionShell id="gallery">
      <SectionHead section={section} />
      <div className="gallery reveal d2">
        {tiles.map(({ t, post, cover }) => (
          <Link href={`/case-studies/${post.slug}`} className="g-tile" key={post.slug}>
            {/* Same frame for every tile: the whole image sits centred over a blurred copy of itself, so nothing is cropped. */}
            <div className="g-art">
              <MediaImage media={cover} alt="" className="g-bg" sizes="(max-width: 560px) 50vw, (max-width: 980px) 50vw, 400px" />
              <MediaImage media={cover} className="g-fg" sizes="(max-width: 560px) 50vw, (max-width: 980px) 50vw, 400px" />
            </div>
            <div className="g-meta">
              <b>{t.title ?? post.title}</b>
              <span>{t.label ?? post.cardLabel ?? post.tag}</span>
            </div>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}
