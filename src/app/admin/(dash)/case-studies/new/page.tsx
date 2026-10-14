import type { Metadata } from "next";
import { PostEditPage } from "@/components/admin/post-pages";

export const metadata: Metadata = { title: "New case study" };
export default function Page() {
  return <PostEditPage type="case_study" id="new" />;
}
