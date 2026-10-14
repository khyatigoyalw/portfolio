import type { Metadata } from "next";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { SectionView } from "@/components/site/sections";
import { getSection, getSections, getSettings, resolveMedia } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const [s, about] = await Promise.all([getSettings(), getSection("about")]);
  const image = await resolveMedia(about?.content.portraitMediaId);
  const title = s.ogTitle ?? s.siteTitle;
  const description = s.ogDescription ?? s.seoDescription;
  return {
    title: { absolute: s.siteTitle },
    description: s.seoDescription,
    authors: [{ name: s.name }],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      title,
      description,
      url: "/",
      images: image ? [{ url: image.src, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function Home() {
  const [settings, sections] = await Promise.all([getSettings(), getSections()]);
  return (
    <>
      <Hero settings={settings} />
      <Marquee items={settings.marquee} />
      {[...sections]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => (
          <SectionView key={s.key} section={s} settings={settings} />
        ))}
    </>
  );
}
