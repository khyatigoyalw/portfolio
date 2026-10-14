import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gate } from "@/components/admin/gate";
import { MediaProvider } from "@/components/admin/media-picker";
import { SectionForm } from "@/components/admin/section-editors";
import { loadMedia, loadPosts, loadSections } from "@/lib/admin/queries";
import { SectionKey } from "@/lib/schema";

export const metadata: Metadata = { title: "Edit section" };

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const g = await gate();
  if (!g.ok) return g.view;
  const parsed = SectionKey.safeParse((await params).key);
  if (!parsed.success) notFound();
  const [sections, media, posts] = await Promise.all([loadSections(g.db), loadMedia(g.db), loadPosts(g.db)]);
  const section = sections.find((s) => s.key === parsed.data);
  if (!section) notFound();
  const opts = (type: string) => posts.filter((p) => p.type === type).map((p) => ({ slug: p.slug, title: p.status === "draft" ? `${p.title} (draft)` : p.title }));
  return (
    <>
      <div className="adm-head">
        <div>
          <p><Link href="/admin/sections">← Home sections</Link></p>
          <h1>Section: {section.key}</h1>
        </div>
      </div>
      <MediaProvider media={media}>
        <SectionForm key={section.key} initial={section} caseStudies={opts("case_study")} articles={opts("article")} />
      </MediaProvider>
    </>
  );
}
