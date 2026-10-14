import type { Metadata } from "next";
import { PostEditPage } from "@/components/admin/post-pages";

export const metadata: Metadata = { title: "Edit article" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostEditPage type="article" id={id} />;
}
