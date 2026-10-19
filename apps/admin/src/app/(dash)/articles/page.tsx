import type { Metadata } from "next";
import { PostsIndexPage } from "@/components/post-pages";

export const metadata: Metadata = { title: "Articles" };
export default function Page() {
  return <PostsIndexPage type="article" />;
}
