import type { Metadata } from "next";
import { PostsIndexPage } from "@/components/post-pages";

export const metadata: Metadata = { title: "Case studies" };
export default function Page() {
  return <PostsIndexPage type="case_study" />;
}
