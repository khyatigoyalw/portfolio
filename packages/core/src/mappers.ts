/**
 * Row <-> domain mappers (snake_case Postgres rows <-> camelCase schema types).
 * Used by data-supabase.ts (read), scripts/push-seed.ts (write) and admin server actions (write).
 * Reads are validated with Zod so a bad row fails loudly instead of rendering garbage.
 */
import { Media, Post, Section, SiteSettings } from "./schema";

type Row = Record<string, unknown>;

/* media ---------------------------------------------------------------- */
export const mediaFromRow = (r: Row): Media =>
  Media.parse({
    id: r.id,
    path: r.path,
    mime: r.mime,
    width: r.width ?? null,
    height: r.height ?? null,
    alt: r.alt ?? "",
    blurDataUrl: r.blur_data_url ?? null,
    bytes: r.bytes == null ? null : Number(r.bytes),
    createdAt: r.created_at ?? undefined,
  });

export const mediaToRow = (m: Media) => ({
  id: m.id,
  path: m.path,
  mime: m.mime,
  width: m.width,
  height: m.height,
  alt: m.alt,
  blur_data_url: m.blurDataUrl,
  bytes: m.bytes,
});

/* site settings -------------------------------------------------------- */
export const settingsFromRow = (r: Row): SiteSettings =>
  SiteSettings.parse({
    name: r.name,
    siteTitle: r.site_title,
    seoDescription: r.seo_description ?? "",
    ogTitle: r.og_title ?? null,
    ogDescription: r.og_description ?? null,
    hero: r.hero,
    marquee: r.marquee ?? [],
    nav: r.nav,
    contact: r.contact,
    footerTagline: r.footer_tagline ?? "",
    resumeMediaId: r.resume_media_id ?? null,
    updatedAt: r.updated_at ?? undefined,
  });

export const settingsToRow = (s: SiteSettings) => ({
  id: 1,
  name: s.name,
  site_title: s.siteTitle,
  seo_description: s.seoDescription,
  og_title: s.ogTitle,
  og_description: s.ogDescription,
  hero: s.hero,
  marquee: s.marquee,
  nav: s.nav,
  contact: s.contact,
  footer_tagline: s.footerTagline,
  resume_media_id: s.resumeMediaId,
});

/* sections ------------------------------------------------------------- */
export const sectionFromRow = (r: Row): Section =>
  Section.parse({
    key: r.key,
    eyebrow: r.eyebrow ?? "",
    heading: r.heading ?? "",
    intro: r.intro ?? "",
    visible: r.visible,
    sortOrder: r.sort_order,
    content: r.content,
    updatedAt: r.updated_at ?? undefined,
  });

export const sectionToRow = (s: Section) => ({
  key: s.key,
  eyebrow: s.eyebrow,
  heading: s.heading,
  intro: s.intro,
  visible: s.visible,
  sort_order: s.sortOrder,
  content: s.content,
});

/* posts ---------------------------------------------------------------- */
export const postFromRow = (r: Row): Post =>
  Post.parse({
    id: r.id,
    type: r.type,
    slug: r.slug,
    status: r.status,
    title: r.title,
    subtitle: r.subtitle ?? "",
    tag: r.tag ?? "",
    cardLabel: r.card_label ?? null,
    excerpt: r.excerpt ?? null,
    readTimeMinutes: r.read_time_minutes ?? null,
    coverMediaId: r.cover_media_id ?? null,
    cardAspect: r.card_aspect ?? null,
    meta: r.meta ?? [],
    body: r.body ?? [],
    skills: r.skills ?? [],
    takeaway: r.takeaway ?? "",
    seoTitle: r.seo_title ?? null,
    seoDescription: r.seo_description ?? null,
    sortOrder: r.sort_order ?? 0,
    publishedAt: r.published_at ?? null,
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  });

export const postToRow = (p: Post) => ({
  id: p.id,
  type: p.type,
  slug: p.slug,
  status: p.status,
  title: p.title,
  subtitle: p.subtitle,
  tag: p.tag,
  card_label: p.cardLabel,
  excerpt: p.excerpt,
  read_time_minutes: p.readTimeMinutes,
  cover_media_id: p.coverMediaId,
  card_aspect: p.cardAspect,
  meta: p.meta,
  body: p.body,
  skills: p.skills,
  takeaway: p.takeaway,
  seo_title: p.seoTitle,
  seo_description: p.seoDescription,
  sort_order: p.sortOrder,
  published_at: p.publishedAt,
});
