/**
 * Single source of truth for the content model.
 *
 * - Every free-text field may use the inline markup in ./inline.ts
 *   (**bold**, *italic*, ==highlight==, [label](url), "\n" = <br>).
 *   Plain-text-only fields are noted.
 * - Images / files are always referenced by Media id (uuid); resolve with
 *   `resolveMedia(id)` from ./data.
 * - TS property names are camelCase; Postgres columns are snake_case
 *   (see ./mappers.ts for the translation).
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* primitives                                                          */
/* ------------------------------------------------------------------ */

export const MediaId = z.string().uuid();
const Text = z.string(); // may be empty; inline markup allowed
const Slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, digits and dashes only");

/** A "big number + caption" pair used by hero chips, timeline metrics, KPIs, results bands. */
export const Stat = z.object({
  value: z.string().min(1), // plain text, e.g. "12×", "₹8L+", "2K→25K+"
  label: z.string().min(1), // plain text
});
export type Stat = z.infer<typeof Stat>;

export const LinkItem = z.object({
  label: z.string().min(1),
  href: z.string().min(1), // "#about", "/case-studies/x", "https://…", "mailto:…"
});
export type LinkItem = z.infer<typeof LinkItem>;

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export const Media = z.object({
  id: MediaId,
  /** Object path inside the Supabase `media` bucket; local mode serves /media/<path>. */
  path: z.string().min(1),
  mime: z.string().min(1),
  /** null for non-images (PDF). */
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  alt: z.string(), // "" for decorative / non-image
  blurDataUrl: z.string().nullable(), // ~16px WebP data URL
  bytes: z.number().int().nonnegative().nullable(),
  createdAt: z.string().optional(),
});
export type Media = z.infer<typeof Media>;

/** What `resolveMedia()` hands to <Image>. */
export const ResolvedMedia = z.object({
  src: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  alt: z.string(),
  blurDataURL: z.string().optional(),
});
export type ResolvedMedia = z.infer<typeof ResolvedMedia>;

/* ------------------------------------------------------------------ */
/* Site settings (single row, id = 1)                                  */
/* ------------------------------------------------------------------ */

export const HeroCta = z.object({
  label: z.string().min(1),
  /** Ignored when isResume is true (the link then points at the resume media). */
  href: z.string(),
  style: z.enum(["primary", "ghost"]),
  /** Resume button: href = resume media URL, rendered with download="<downloadName>". */
  isResume: z.boolean().default(false),
  downloadName: z.string().optional(),
  /** Trailing glyph, e.g. "↗" (rendered in span.arr) */
  icon: z.string().optional(),
});
export type HeroCta = z.infer<typeof HeroCta>;

export const Hero = z.object({
  hiLine: z.string().min(1), // "Hi, I'm Khyati Goyal"
  /** One entry per animated line (span.l > span). Use *…* for <em>, ==…== for span.beige. */
  headlineLines: z.array(Text).min(1),
  sub: Text,
  tags: z.array(z.string().min(1)),
  ctas: z.array(HeroCta),
  stats: z.array(Stat), // hero chips
  scrollCue: z.string(), // "Scroll to explore"
});
export type Hero = z.infer<typeof Hero>;

export const SiteContact = z.object({
  email: z.string().min(1),
  linkedinUrl: z.string().min(1),
  linkedinLabel: z.string().min(1), // "LinkedIn"
  phone: z.string().min(1), // tel: form, "+917060935925"
  phoneDisplay: z.string().min(1), // "+91 70609 35925"
  availability: z.string(), // "Open to 0→1 brand mandates · Gurugram / Remote"
});
export type SiteContact = z.infer<typeof SiteContact>;

export const Nav = z.object({
  links: z.array(LinkItem),
  cta: LinkItem,
});
export type Nav = z.infer<typeof Nav>;

export const SiteSettings = z.object({
  /** Person / brand name shown in nav + footer: "Khyati Goyal" (last word is bolded). */
  name: z.string().min(1),
  siteTitle: z.string().min(1), // <title> of the home page
  seoDescription: z.string(),
  ogTitle: z.string().nullable(),
  ogDescription: z.string().nullable(),
  hero: Hero,
  marquee: z.array(z.string().min(1)), // stored ONCE; the renderer duplicates it for the loop
  nav: Nav,
  contact: SiteContact,
  footerTagline: z.string(),
  resumeMediaId: MediaId.nullable(),
  updatedAt: z.string().optional(),
});
export type SiteSettings = z.infer<typeof SiteSettings>;

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export const SECTION_KEYS = [
  "about",
  "journey",
  "expertise",
  "work",
  "playbook",
  "metrics",
  "gallery",
  "testimonials",
  "brain",
  "writing",
  "contact",
] as const;
export const SectionKey = z.enum(SECTION_KEYS);
export type SectionKey = z.infer<typeof SectionKey>;

const sectionBase = {
  /** Small mono label above the heading. */
  eyebrow: z.string(),
  /** Big heading; "\n" = <br>, *…* = <em>. For `about` this is the pull-quote. */
  heading: z.string(),
  /** Lead paragraph under the heading ("" when the section has none). */
  intro: z.string(),
  visible: z.boolean(),
  sortOrder: z.number().int(),
  updatedAt: z.string().optional(),
};

/* about -------------------------------------------------------------- */
export const AboutContent = z.object({
  portraitMediaId: MediaId.nullable(),
  badge: Stat, // "3+ yrs" / "Building & scaling brands"
  paragraphs: z.array(Text), // inline markup (**bold** is used)
  pillars: z.array(z.object({ num: z.string(), title: z.string(), text: Text })),
});
export type AboutContent = z.infer<typeof AboutContent>;

/* journey ------------------------------------------------------------ */
export const JourneyItem = z.object({
  year: z.string().min(1), // "2022 → 2023"
  /** null = no logo (the "What's next" chapter). */
  logoMediaId: MediaId.nullable(),
  logoVariant: z.enum(["card", "plain", "round"]).nullable(), // .tl-logo--card|plain|round
  title: z.string().min(1),
  role: z.string(),
  body: Text,
  metrics: z.array(Stat),
});
export type JourneyItem = z.infer<typeof JourneyItem>;
export const JourneyContent = z.object({ items: z.array(JourneyItem) });
export type JourneyContent = z.infer<typeof JourneyContent>;

/* expertise ---------------------------------------------------------- */
export const ExpertiseContent = z.object({
  cards: z.array(z.object({ num: z.string(), title: z.string().min(1), tags: z.array(z.string().min(1)) })),
});
export type ExpertiseContent = z.infer<typeof ExpertiseContent>;

/* work --------------------------------------------------------------- */
/** One .cs-block inside a project accordion. `title` is stored WITHOUT the leading "◆ " (the renderer adds it). */
export const WorkBlock = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("paragraph"), title: z.string().min(1), full: z.boolean(), text: Text }),
  z.object({ kind: z.literal("list"), title: z.string().min(1), full: z.boolean(), items: z.array(Text) }),
  z.object({ kind: z.literal("chips"), title: z.string().min(1), full: z.boolean(), items: z.array(z.string().min(1)) }),
]);
export type WorkBlock = z.infer<typeof WorkBlock>;

export const WorkProject = z.object({
  /** DOM id suffix: "ng" -> #proj-ng */
  id: Slug,
  index: z.string(), // "01 — Health & Wellness · D2C"
  name: z.string().min(1),
  role: z.string(),
  desc: Text,
  kpis: z.array(Stat),
  toggleLabel: z.string(), // "Read the full case study"
  logoMediaId: MediaId.nullable(),
  logoVariant: z.enum(["card", "round", "wide"]).nullable(), // .proj-logo--card|round|wide
  blocks: z.array(WorkBlock),
  results: z.array(Stat), // results band
});
export type WorkProject = z.infer<typeof WorkProject>;
export const WorkContent = z.object({ projects: z.array(WorkProject) });
export type WorkContent = z.infer<typeof WorkContent>;

/* playbook ----------------------------------------------------------- */
export const PlaybookContent = z.object({
  steps: z.array(z.object({ num: z.string(), title: z.string().min(1), text: Text })),
  /** Flywheel centre label. Node positions are computed from steps.length (evenly around the ring). */
  centerSymbol: z.string(), // "∞"
  centerLabel: z.string(), // "Always-on loop"
});
export type PlaybookContent = z.infer<typeof PlaybookContent>;

/* metrics ------------------------------------------------------------ */
export const MetricCell = z.object({
  prefix: z.string(), // "₹", "-" or ""
  to: z.number(), // count-up target
  decimals: z.number().int().min(0).max(3),
  suffix: z.string(), // "L+", "K+", "×", "%", "°", "+"
  label: z.string().min(1),
});
export type MetricCell = z.infer<typeof MetricCell>;
export const MetricsContent = z.object({ cells: z.array(MetricCell) });
export type MetricsContent = z.infer<typeof MetricsContent>;

/* gallery ------------------------------------------------------------ */
/**
 * Ordered tiles; each points at a published case-study (post.type = 'case_study').
 * Image and default label come from the post (coverMediaId, cardLabel); tiles share one 4:5 frame.
 * the optional fields below override them for that tile only.
 */
export const GalleryTile = z.object({
  slug: Slug,
  title: z.string().nullable(), // g-meta <b>; null = post.title
  label: z.string().nullable(), // g-meta <span>; null = post.cardLabel
  /** "logo" = contain on dark background (.logo.logo--color), "default" = cover */
  variant: z.enum(["default", "logo"]),
});
export type GalleryTile = z.infer<typeof GalleryTile>;
export const GalleryContent = z.object({ tiles: z.array(GalleryTile) });
export type GalleryContent = z.infer<typeof GalleryContent>;

/* testimonials ------------------------------------------------------- */
export const TestimonialsContent = z.object({
  items: z.array(
    z.object({
      quote: Text,
      initial: z.string().min(1).max(2), // avatar letter
      name: z.string().min(1),
      role: z.string(),
    }),
  ),
});
export type TestimonialsContent = z.infer<typeof TestimonialsContent>;

/* brain -------------------------------------------------------------- */
/** `kicker` and `title` are stored WITHOUT the leading "◆ " (renderer adds it to the kicker). */
export const BrainCard = z.discriminatedUnion("variant", [
  z.object({ variant: z.literal("list"), kicker: z.string(), title: z.string(), items: z.array(Text) }),
  z.object({
    variant: z.literal("archetypes"),
    kicker: z.string(),
    title: z.string(),
    text: Text,
    chips: z.array(z.object({ label: z.string().min(1), on: z.boolean() })),
  }),
  z.object({ variant: z.literal("text"), kicker: z.string(), title: z.string(), text: Text }),
]);
export type BrainCard = z.infer<typeof BrainCard>;
export const BrainContent = z.object({ cards: z.array(BrainCard) });
export type BrainContent = z.infer<typeof BrainContent>;

/* writing ------------------------------------------------------------ */
/** Ordered article slugs shown as cards (post.type = 'article'). */
export const WritingContent = z.object({ slugs: z.array(Slug) });
export type WritingContent = z.infer<typeof WritingContent>;

/* contact ------------------------------------------------------------ */
/** Heading/eyebrow/intro live on the section; links + availability live in SiteSettings.contact. */
export const ContactContent = z.object({});
export type ContactContent = z.infer<typeof ContactContent>;

/* discriminated union ------------------------------------------------ */
const sec = <K extends SectionKey, C extends z.ZodType>(key: K, content: C) =>
  z.object({ key: z.literal(key), ...sectionBase, content });

export const Section = z.discriminatedUnion("key", [
  sec("about", AboutContent),
  sec("journey", JourneyContent),
  sec("expertise", ExpertiseContent),
  sec("work", WorkContent),
  sec("playbook", PlaybookContent),
  sec("metrics", MetricsContent),
  sec("gallery", GalleryContent),
  sec("testimonials", TestimonialsContent),
  sec("brain", BrainContent),
  sec("writing", WritingContent),
  sec("contact", ContactContent),
]);
export type Section = z.infer<typeof Section>;
export type SectionOf<K extends SectionKey> = Extract<Section, { key: K }>;

export const SectionContentSchemas = {
  about: AboutContent,
  journey: JourneyContent,
  expertise: ExpertiseContent,
  work: WorkContent,
  playbook: PlaybookContent,
  metrics: MetricsContent,
  gallery: GalleryContent,
  testimonials: TestimonialsContent,
  brain: BrainContent,
  writing: WritingContent,
  contact: ContactContent,
} as const;

/* ------------------------------------------------------------------ */
/* Posts (case studies + articles)                                     */
/* ------------------------------------------------------------------ */

export const Block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), level: z.union([z.literal(3), z.literal(4)]), text: Text }),
  z.object({ type: z.literal("paragraph"), text: Text }),
  z.object({ type: z.literal("list"), items: z.array(Text) }),
  z.object({ type: z.literal("image"), mediaId: MediaId, caption: Text.optional() }),
  z.object({ type: z.literal("quote"), text: Text, cite: Text.optional() }),
]);
export type Block = z.infer<typeof Block>;

export const PostType = z.enum(["case_study", "article"]);
export type PostType = z.infer<typeof PostType>;
export const PostStatus = z.enum(["draft", "published"]);
export type PostStatus = z.infer<typeof PostStatus>;

export const PostMeta = z.object({ label: z.string().min(1), value: Text });
export type PostMeta = z.infer<typeof PostMeta>;

export const Post = z.object({
  id: z.string().uuid(),
  type: PostType,
  slug: Slug,
  status: PostStatus,
  title: z.string().min(1),
  /** "" when the source has none (page then omits .cs-subtitle). */
  subtitle: Text,
  /**
   * Hero tag (.cs-tag). case_study: category label ("Marketplace").
   * article: category only ("D2C · Growth"); the page appends " · {readTime} min read".
   */
  tag: z.string(),
  /** Gallery tile label for case studies (null for articles). */
  cardLabel: z.string().nullable(),
  /** Short blurb on the home-page article card (null for case studies). */
  excerpt: z.string().nullable(),
  readTimeMinutes: z.number().int().positive().nullable(),
  /** Gallery tile image (case study) / article card image. */
  coverMediaId: MediaId.nullable(),
  /** CSS aspect-ratio for the gallery tile, "1080/2400" (case studies only). */
  cardAspect: z.string().regex(/^\d+\/\d+$/).nullable(),
  /** Rows under the hero (Brand / Role / Objective …). */
  meta: z.array(PostMeta),
  body: z.array(Block),
  /** "Skills demonstrated" chips (empty = section hidden). */
  skills: z.array(z.string().min(1)),
  /** Italic closing callout (.cs-takeaway); "" = hidden. */
  takeaway: Text,
  /** null = derive from title / subtitle. */
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  sortOrder: z.number().int(),
  publishedAt: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Post = z.infer<typeof Post>;

/* ------------------------------------------------------------------ */
/* Seed file                                                           */
/* ------------------------------------------------------------------ */

export const SeedFile = z
  .object({
    generatedAt: z.string(),
    settings: SiteSettings,
    sections: z.array(Section),
    posts: z.array(Post),
    media: z.array(Media),
  })
  .superRefine((seed, ctx) => {
    // Referential integrity: every media id and slug reference must resolve.
    const mediaIds = new Set(seed.media.map((m) => m.id));
    const check = (id: string | null | undefined, where: string) => {
      if (id && !mediaIds.has(id)) ctx.addIssue({ code: "custom", message: `unknown media id ${id} at ${where}` });
    };
    check(seed.settings.resumeMediaId, "settings.resumeMediaId");
    for (const s of seed.sections) {
      if (s.key === "about") check(s.content.portraitMediaId, "about.portrait");
      if (s.key === "journey") s.content.items.forEach((it, i) => check(it.logoMediaId, `journey[${i}]`));
      if (s.key === "work") s.content.projects.forEach((p) => check(p.logoMediaId, `work.${p.id}`));
    }
    const slugs = {
      case_study: new Set(seed.posts.filter((p) => p.type === "case_study").map((p) => p.slug)),
      article: new Set(seed.posts.filter((p) => p.type === "article").map((p) => p.slug)),
    };
    for (const p of seed.posts) {
      check(p.coverMediaId, `post ${p.slug}.cover`);
      p.body.forEach((b, i) => b.type === "image" && check(b.mediaId, `post ${p.slug}.body[${i}]`));
    }
    for (const s of seed.sections) {
      if (s.key === "gallery")
        for (const t of s.content.tiles)
          if (!slugs.case_study.has(t.slug)) ctx.addIssue({ code: "custom", message: `gallery tile -> unknown case study ${t.slug}` });
      if (s.key === "writing")
        for (const slug of s.content.slugs)
          if (!slugs.article.has(slug)) ctx.addIssue({ code: "custom", message: `writing -> unknown article ${slug}` });
    }
  });
export type SeedFile = z.infer<typeof SeedFile>;
