import type { Post, PostType } from "@/lib/schema";

export type PostDraft = Omit<Post, "id" | "sortOrder" | "publishedAt" | "createdAt" | "updatedAt"> & { id: string | null };

export const emptyPost = (type: PostType): PostDraft => ({
  id: null, type, slug: "", status: "draft", title: "", subtitle: "", tag: "",
  cardLabel: type === "case_study" ? "" : null, excerpt: type === "article" ? "" : null,
  readTimeMinutes: null, coverMediaId: null, cardAspect: null, meta: [], body: [], skills: [], takeaway: "",
  seoTitle: null, seoDescription: null,
});

export const toDraft = (p: Post): PostDraft => {
  const { sortOrder: _s, publishedAt: _p, createdAt: _c, updatedAt: _u, ...rest } = p;
  void _s; void _p; void _c; void _u;
  return rest;
};
