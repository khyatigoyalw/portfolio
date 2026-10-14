import type { Metadata } from "next";
import { PostEditPage } from "@/components/admin/post-pages";

export const metadata: Metadata = { title: "Edit case study" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostEditPage type="case_study" id={id} />;
}
