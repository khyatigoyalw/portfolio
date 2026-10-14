import Link from "next/link";
import { notFound } from "next/navigation";
import { loadMedia, loadPost, loadPosts } from "@/lib/admin/queries";
import type { PostType } from "@/lib/schema";
import { gate } from "./gate";
import { MediaProvider } from "./media-picker";
import { PostEditor } from "./post-editor";
import { emptyPost, toDraft } from "./post-draft";
import { PostsList } from "./posts-list";

const META = {
  case_study: { title: "Case studies", noun: "case study", base: "/admin/case-studies" },
  article: { title: "Articles", noun: "article", base: "/admin/articles" },
} as const;

export async function PostsIndexPage({ type }: { type: PostType }) {
  const g = await gate();
  if (!g.ok) return g.view;
  const posts = await loadPosts(g.db, type);
  const m = META[type];
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>{m.title}</h1>
          <p>Drafts stay hidden from the public site. Order here is the order on the site.</p>
        </div>
        <Link className="adm-btn primary" href={`${m.base}/new`}>+ New {m.noun}</Link>
      </div>
      <PostsList type={type} initial={posts.map((p) => ({ id: p.id, slug: p.slug, title: p.title, status: p.status, tag: p.tag, updatedAt: p.updatedAt ?? null }))} />
    </>
  );
}

export async function PostEditPage({ type, id }: { type: PostType; id: string | "new" }) {
  const g = await gate();
  if (!g.ok) return g.view;
  const m = META[type];
  const [media, post] = await Promise.all([loadMedia(g.db), id === "new" ? null : loadPost(g.db, id)]);
  if (id !== "new" && (!post || post.type !== type)) notFound();
  return (
    <>
      <div className="adm-head">
        <div>
          <p><Link href={m.base}>← {m.title}</Link></p>
          <h1>{post ? post.title : `New ${m.noun}`}</h1>
        </div>
      </div>
      <MediaProvider media={media}>
        <PostEditor key={post?.id ?? "new"} initial={post ? toDraft(post) : emptyPost(type)} />
      </MediaProvider>
    </>
  );
}
