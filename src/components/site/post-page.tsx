import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { getAdjacentPosts, getPost, getSettings, resolveMedia } from "@/lib/data";
import { getPostForPreview } from "@/lib/data-preview";
import { inlineToPlain } from "@/lib/inline";
import type { Block, Post, PostType } from "@/lib/schema";
import { Inline } from "./inline";
import { MediaImage } from "./media-image";

const BASE = { case_study: "/case-studies", article: "/articles" } as const;

export function postDescription(post: Post): string {
  return post.seoDescription ?? inlineToPlain(post.subtitle || post.takeaway);
}

/** The published post, or in draft mode (admin Preview) the latest saved version, drafts included. */
async function loadPost(type: PostType, slug: string): Promise<{ post: Post | null; preview: boolean }> {
  const { isEnabled } = await draftMode();
  const draft = isEnabled ? await getPostForPreview(type, slug) : null;
  return draft ? { post: draft, preview: true } : { post: await getPost(type, slug), preview: false };
}

export async function postMetadata(type: PostType, slug: string): Promise<Metadata> {
  const [{ post, preview }, settings] = await Promise.all([loadPost(type, slug), getSettings()]);
  if (!post) return {};
  const description = postDescription(post);
  const isCase = type === "case_study";
  const cover = await resolveMedia(post.coverMediaId);
  return {
    title: post.seoTitle ?? (isCase ? `${post.title} — Case Study | ${settings.name}` : `${post.title} | ${settings.name}`),
    description,
    openGraph: {
      type: "article",
      title: post.seoTitle ?? (isCase ? `${post.title} — ${settings.name}` : `${post.title} | ${settings.name}`),
      description,
      url: `${BASE[type]}/${post.slug}`,
      images: cover ? [{ url: cover.src, width: cover.width ?? undefined, height: cover.height ?? undefined, alt: cover.alt }] : undefined,
    },
    twitter: { card: cover ? "summary_large_image" : "summary" },
    ...(preview ? { robots: { index: false, follow: false } } : {}),
  };
}

async function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return block.level === 3 ? (
        <h3>
          <Inline text={block.text} />
        </h3>
      ) : (
        <h4>
          <Inline text={block.text} />
        </h4>
      );
    case "paragraph":
      return (
        <p>
          <Inline text={block.text} />
        </p>
      );
    case "list":
      return (
        <ul>
          {block.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );
    case "image": {
      const media = await resolveMedia(block.mediaId);
      return (
        <figure className="cs-figure">
          <MediaImage media={media} sizes="(max-width: 800px) 100vw, 70ch" />
          {block.caption && (
            <figcaption>
              <Inline text={block.caption} />
            </figcaption>
          )}
        </figure>
      );
    }
    case "quote":
      return (
        <blockquote className="cs-quote">
          <p>
            <Inline text={block.text} />
          </p>
          {block.cite && (
            <cite>
              <Inline text={block.cite} />
            </cite>
          )}
        </blockquote>
      );
  }
}

/** Shared layout of /case-studies/[slug] and /articles/[slug]. */
export async function PostPage({ type, slug }: { type: PostType; slug: string }) {
  const { post, preview } = await loadPost(type, slug);
  if (!post) notFound();
  const { prev, next } = await getAdjacentPosts(type, slug);
  const isCase = type === "case_study";
  const tag = !isCase && post.readTimeMinutes ? `${post.tag} · ${post.readTimeMinutes} min read` : post.tag;

  return (
    <>
      {preview && (
        <div className="preview-banner" role="status">
          Draft preview{post.status === "draft" ? " (not published)" : ""} ·{" "}
          <a href={`/api/draft?disable=1&redirect=${post.status === "draft" ? "/admin" : `${BASE[type]}/${post.slug}`}`}>Exit preview</a>
        </div>
      )}
      <header className="cs-hero">
        <div className="wrap">
          <Link href={isCase ? "/#gallery" : "/#writing"} className="cs-back reveal in">
            {isCase ? "← Back to work" : "← Back to field notes"}
          </Link>
          <div className="cs-tag reveal in d1">{tag}</div>
          <h1 className="cs-title reveal in d1" style={isCase ? undefined : { maxWidth: "20ch" }}>
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="cs-subtitle reveal in d2">
              <Inline text={post.subtitle} />
            </p>
          )}
          {post.meta.length > 0 && (
            <div className="cs-meta reveal in d2">
              {post.meta.map((m) => (
                <div key={m.label}>
                  <b>{m.label}</b>
                  <span>
                    <Inline text={m.value} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="section" style={{ paddingTop: isCase ? 56 : 40 }}>
        <div className="wrap">
          <div className="cs-body reveal in">
            {post.body.map((b, i) => (
              <BlockView key={i} block={b} />
            ))}
            {post.skills.length > 0 && (
              <>
                <h3>Skills demonstrated</h3>
                <div className="cs-skills">
                  {post.skills.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </>
            )}
            {post.takeaway && (
              <div className="cs-takeaway">
                <p>
                  <Inline text={post.takeaway} />
                </p>
              </div>
            )}
          </div>
          <div className="cs-foot-nav reveal in">
            {prev ? (
              <Link href={`${BASE[type]}/${prev.slug}`} className="cs-next">
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            <Link href={isCase ? "/#gallery" : "/#writing"} className="cs-foot-btn">
              {isCase ? "Back to portfolio" : "Back to field notes"}
            </Link>
            {next ? (
              <Link href={`${BASE[type]}/${next.slug}`} className="cs-next">
                {next.title} →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
