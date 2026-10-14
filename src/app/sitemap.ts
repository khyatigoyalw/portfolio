import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/data";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cases, articles] = await Promise.all([getPosts("case_study"), getPosts("article")]);
  const entry = (path: string, p?: { updatedAt?: string; publishedAt: string | null }, priority = 0.7) => ({
    url: `${SITE}${path}`,
    lastModified: p?.updatedAt ?? p?.publishedAt ?? undefined,
    priority,
  });
  return [
    entry("/", undefined, 1),
    ...cases.map((p) => entry(`/case-studies/${p.slug}`, p)),
    ...articles.map((p) => entry(`/articles/${p.slug}`, p)),
  ];
}
