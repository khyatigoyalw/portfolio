import type { Metadata } from "next";
import { PostEditPage } from "@/components/post-pages";

export const metadata: Metadata = { title: "New article" };
export default function Page() {
  return <PostEditPage type="article" id="new" />;
}
