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
            <div className={`g-art ga img${t.variant === "logo" ? " logo logo--color" : ""}`}>
              <div className="inner">
                <MediaImage media={cover} sizes="(max-width: 560px) 100vw, (max-width: 980px) 50vw, 400px" />
              </div>
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
