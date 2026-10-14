import Link from "next/link";
import { getPosts, resolveMedia } from "@/lib/data";
import type { SectionOf } from "@/lib/schema";
import { Inline } from "./inline";
import { MediaImage } from "./media-image";
import { delay, SectionHead, SectionShell } from "./section-head";

export async function Writing({ section }: { section: SectionOf<"writing"> }) {
  const posts = new Map((await getPosts("article")).map((p) => [p.slug, p]));
  const cards = (
    await Promise.all(
      section.content.slugs.map(async (slug) => {
        const post = posts.get(slug);
        return post ? { post, cover: await resolveMedia(post.coverMediaId) } : null;
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <SectionShell id="writing">
      <SectionHead section={section} />
      <div className="blog-grid">
        {cards.map(({ post, cover }, i) => (
          <Link href={`/articles/${post.slug}`} className={`post reveal ${delay(i)}`} key={post.slug}>
            <div className="post-art">
              <MediaImage media={cover} sizes="(max-width: 700px) 100vw, 420px" />
            </div>
            <div className="post-body">
              <div className="post-cat">{post.tag}</div>
              <h4>{post.title}</h4>
              {post.excerpt && (
                <p>
                  <Inline text={post.excerpt} />
                </p>
              )}
              {post.readTimeMinutes && <div className="post-meta">{post.readTimeMinutes} min read</div>}
            </div>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}
