import type { Metadata } from "next";
import { PostPage, postMetadata } from "@/components/site/post-page";
import { getPosts } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPosts("article")).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return postMetadata("article", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <PostPage type="article" slug={(await params).slug} />;
}
