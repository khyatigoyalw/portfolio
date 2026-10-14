/**
 * Parses the legacy static site (legacy/index.html, legacy/case-studies/*.html, legacy/articles/*.html)
 * into content/seed.json, copies the images it uses to public/media/ and records width/height/blur.
 *
 *   npm run seed:legacy
 *
 * The result is validated against src/lib/schema.ts (SeedFile) and the script exits non-zero on
 * any failure. Anything odd in the source is REPORTED, never silently fixed.
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";
import sharp from "sharp";
import { escapeInline } from "../src/lib/inline";
import {
  Block,
  SeedFile,
  type AboutContent,
  type BrainCard,
  type JourneyItem,
  type Media,
  type MetricCell,
  type Post,
  type Section,
  type SectionKey,
  type Stat,
  type WorkBlock,
} from "../src/lib/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEGACY = path.join(ROOT, "legacy");
const ASSETS = path.join(LEGACY, "assets");
const OUT_JSON = path.join(ROOT, "content", "seed.json");
const OUT_MEDIA = path.join(ROOT, "public", "media");

/* ------------------------------------------------------------------ */
/* report                                                              */
/* ------------------------------------------------------------------ */

const oddities: { where: string; what: string }[] = [];
const odd = (where: string, what: string) => oddities.push({ where, what });
const die = (msg: string): never => {
  throw new Error(msg);
};

/* ------------------------------------------------------------------ */
/* html helpers                                                        */
/* ------------------------------------------------------------------ */

const read = async (file: string) => parse(await fs.readFile(file, "utf8"));
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

function one(el: HTMLElement, sel: string, where = "?"): HTMLElement {
  return el.querySelector(sel) ?? die(`missing ${sel} in ${where}`);
}
const all = (el: HTMLElement, sel: string) => el.querySelectorAll(sel);

const isEl = (n: Node): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;

/** Decoded text content with whitespace collapsed, optionally skipping some child elements. */
function plain(el: HTMLElement, skip?: string): string {
  const walk = (n: Node): string => {
    if (n.nodeType === NodeType.TEXT_NODE) return n.text;
    if (!isEl(n)) return "";
    if (skip && n.matches(skip)) return "";
    if (n.tagName === "BR") return " ";
    return n.childNodes.map(walk).join("");
  };
  return collapse(walk(el));
}

/** Inner HTML -> inline markup (see src/lib/inline.ts). Entities are decoded; whitespace collapsed. */
function inline(el: HTMLElement, where: string, skip?: string): string {
  const walk = (n: Node): string => {
    if (n.nodeType === NodeType.TEXT_NODE) return escapeInline(n.text.replace(/\s+/g, " "));
    if (!isEl(n)) return "";
    if (skip && n.matches(skip)) return "";
    const inner = () => n.childNodes.map(walk).join("");
    switch (n.tagName) {
      case "STRONG":
      case "B":
        return wrapMark("**", inner());
      case "EM":
      case "I":
        return wrapMark("*", inner());
      case "A":
        return `[${inner()}](${n.getAttribute("href") ?? ""})`;
      case "BR":
        return "\n";
      case "SPAN":
        if (n.classList.contains("beige")) return wrapMark("==", inner());
        if (n.getAttribute("class")) odd(where, `unhandled <span class="${n.getAttribute("class")}"> flattened to text`);
        return inner();
      default:
        odd(where, `unhandled <${n.tagName.toLowerCase()}> flattened to text`);
        return inner();
    }
  };
  return el.childNodes.map(walk).join("")
    .replace(/ *\n */g, "\n")
    .replace(/^[ \n]+|[ \n]+$/g, "");
}

/** Keep whitespace outside the markers so `**a **b` never happens. */
function wrapMark(m: string, s: string): string {
  const lead = s.match(/^\s*/)![0];
  const trail = s.match(/\s*$/)![0];
  const core = s.trim();
  return core ? `${lead}${m}${core}${m}${trail}` : s;
}

const num = (s: string, where: string) => {
  const n = Number(s);
  if (!Number.isFinite(n)) die(`not a number "${s}" at ${where}`);
  return n;
};

const stripDiamond = (s: string) => s.replace(/^◆\s*/, "");

/* ------------------------------------------------------------------ */
/* ids + media                                                         */
/* ------------------------------------------------------------------ */

const NS = "6f1c0f4e-7a43-4c86-9d1b-2a6d5b8c9e10";
/** Deterministic UUID (v5-style) so re-seeding never changes ids. */
function uuid5(name: string): string {
  const ns = Buffer.from(NS.replace(/-/g, ""), "hex");
  const h = createHash("sha1").update(ns).update(name).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const mediaById = new Map<string, Media>();
const mediaAltSeen = new Map<string, string>();
const usedAssets = new Set<string>();

const safeName = (file: string) => file.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
const MIME: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf" };

/** Register an asset (src like "assets/foo.webp"), copy it to public/media and return its media id. */
async function registerAsset(src: string, alt: string, where: string): Promise<string> {
  const rel = decodeURIComponent(src).replace(/^(\.\.\/)?assets\//, "");
  const abs = path.join(ASSETS, rel);
  const name = safeName(rel);
  const id = uuid5(`media:${name}`);
  usedAssets.add(rel);

  const seen = mediaAltSeen.get(id);
  if (seen !== undefined) {
    if (alt && seen !== alt) odd(where, `image ${rel} used with different alt text: "${seen}" vs "${alt}" (keeping first)`);
    return id;
  }
  mediaAltSeen.set(id, alt);

  const buf = await fs.readFile(abs).catch(() => die(`asset not found: ${abs} (${where})`));
  const ext = path.extname(name).toLowerCase();
  const mime = MIME[ext] ?? die(`unknown mime for ${name}`);
  let width: number | null = null;
  let height: number | null = null;
  let blurDataUrl: string | null = null;
  if (mime.startsWith("image/")) {
    const meta = await sharp(buf).metadata();
    width = meta.width ?? die(`no width for ${name}`);
    height = meta.height ?? die(`no height for ${name}`);
    const blur = await sharp(buf).resize({ width: 16, height: 16, fit: "inside" }).webp({ quality: 40 }).toBuffer();
    blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`;
  }
  if (name !== rel) odd(where, `asset file renamed for storage: "${rel}" -> "${name}"`);
  if (mime.startsWith("image/") && !alt) odd(where, `image ${rel} has no alt text`);
  await fs.mkdir(OUT_MEDIA, { recursive: true });
  await fs.writeFile(path.join(OUT_MEDIA, name), buf);
  mediaById.set(id, { id, path: name, mime, width, height, alt, blurDataUrl, bytes: buf.length });
  return id;
}

/* ------------------------------------------------------------------ */
/* index.html                                                          */
/* ------------------------------------------------------------------ */

const stat = (el: HTMLElement, where: string): Stat => ({
  value: plain(one(el, "b", where)),
  label: plain(one(el, "small", where)),
});

function variantOf(el: HTMLElement, prefix: string, allowed: string[], where: string): string | null {
  const m = el.classList.value.find((c) => c.startsWith(`${prefix}--`));
  if (!m) return null;
  const v = m.slice(prefix.length + 2);
  if (!allowed.includes(v)) odd(where, `unknown variant class ${m}`);
  return v;
}

async function parseSettings(root: HTMLElement) {
  const where = "index.html settings";
  const head = (sel: string) => root.querySelector(sel)?.getAttribute("content") ?? null;
  const hero = one(root, "header.hero", where);

  const marqueeAll = all(root, ".marquee-track span").map((s) => plain(s));
  const half = marqueeAll.length / 2;
  const first = marqueeAll.slice(0, half);
  if (!Number.isInteger(half) || first.join("|") !== marqueeAll.slice(half).join("|")) {
    odd(where, "marquee is not an exact duplicate of itself; stored full list as-is");
  }
  const marquee = Number.isInteger(half) && first.join("|") === marqueeAll.slice(half).join("|") ? first : marqueeAll;

  const links = all(one(root, ".nav-links", where), "a").map((a) => ({ label: plain(a), href: a.getAttribute("href")! }));
  const ctaEl = one(root, ".nav-cta", where);
  const cta = { label: plain(ctaEl), href: ctaEl.getAttribute("href")! };
  const mobile = all(one(root, "#mobileMenu", where), "a").map((a) => `${plain(a)}|${a.getAttribute("href")}`);
  const desktop = [...links, cta].map((l) => `${l.label}|${l.href}`);
  if (mobile.join(",") !== desktop.join(",")) odd(where, "mobile menu links differ from desktop nav links");

  const ctas = [];
  for (const a of all(hero, ".hero-cta a")) {
    const isResume = a.getAttribute("id") === "resumeBtn";
    const arr = a.querySelector(".arr");
    ctas.push({
      label: plain(a, ".arr"),
      href: isResume ? "" : a.getAttribute("href")!,
      style: a.classList.contains("btn-primary") ? ("primary" as const) : ("ghost" as const),
      isResume,
      downloadName: isResume ? (a.getAttribute("download") ?? undefined) : undefined,
      icon: arr ? plain(arr) : undefined,
    });
  }
  const resumeHref = one(hero, "#resumeBtn", where).getAttribute("href")!;
  const resumeMediaId = await registerAsset(resumeHref, "", `${where} resume`);

  const contactLinks = all(one(root, ".contact-links", where), "a");
  const hrefOf = (prefix: string) => contactLinks.find((a) => a.getAttribute("href")!.startsWith(prefix)) ?? die(`no ${prefix} link`);
  const mail = hrefOf("mailto:");
  const li = hrefOf("https://www.linkedin.com");
  const tel = hrefOf("tel:");
  const iconText = (a: HTMLElement) => plain(a, ".ci");

  const brand = plain(one(root, ".nav .brand", where));
  if (plain(one(root, "footer .brand", where)) !== brand) odd(where, "footer brand differs from nav brand");

  return {
    name: brand,
    siteTitle: plain(one(root, "title", where)),
    seoDescription: head('meta[name="description"]') ?? "",
    ogTitle: head('meta[property="og:title"]'),
    ogDescription: head('meta[property="og:description"]'),
    hero: {
      hiLine: plain(one(hero, ".hero-hi", where)),
      headlineLines: all(hero, "h1 .l").map((l) => inline(l, `${where} h1`)),
      sub: inline(one(hero, ".hero-sub", where), `${where} sub`),
      tags: all(hero, ".hero-tags span").map((s) => plain(s)),
      ctas,
      stats: all(hero, ".hero-stats .chip").map((c) => stat(c, where)),
      scrollCue: plain(one(hero, ".scroll-cue", where)),
    },
    marquee,
    nav: { links, cta },
    contact: {
      email: mail.getAttribute("href")!.replace("mailto:", ""),
      linkedinUrl: li.getAttribute("href")!,
      linkedinLabel: iconText(li),
      phone: tel.getAttribute("href")!.replace("tel:", ""),
      phoneDisplay: iconText(tel),
      availability: plain(one(root, ".c-avail", where)),
    },
    footerTagline: plain(one(root, "footer p", where)),
    resumeMediaId,
  };
}

type SecBase = { eyebrow: string; heading: string; intro: string };

function sectionBase(sec: HTMLElement, headingSel: string, key: string): SecBase {
  const where = `index.html #${key}`;
  const eyebrow = one(sec, ".eyebrow", where);
  const lead = sec.querySelector(".lead");
  return {
    eyebrow: plain(eyebrow),
    heading: inline(one(sec, headingSel, where), where),
    intro: lead ? inline(lead, where) : "",
  };
}

type GalleryInfo = { slug: string; title: string; label: string; variant: "default" | "logo"; aspect: string; mediaId: string; alt: string; w: number; h: number };

async function parseIndex(root: HTMLElement) {
  const sections: Section[] = [];
  const gallery: GalleryInfo[] = [];
  const articleCards: { slug: string; tag: string; readTime: number; excerpt: string; title: string; mediaId: string }[] = [];
  const secEl = (id: string) => one(root, `section#${id}`, "index.html");
  let order = 0;
  const push = <K extends SectionKey>(key: K, base: SecBase, content: Extract<Section, { key: K }>["content"]) => {
    sections.push({ key, ...base, visible: true, sortOrder: (order += 10), content } as Section);
  };

  // about
  {
    const s = secEl("about");
    const w = "index.html #about";
    const img = one(s, ".about-portrait img", w);
    const content: AboutContent = {
      portraitMediaId: await registerAsset(img.getAttribute("src")!, img.getAttribute("alt") ?? "", w),
      badge: stat(one(s, ".about-badge", w), w),
      paragraphs: all(s, ".about-body p").map((p) => inline(p, w)),
      pillars: all(s, ".pillar").map((p) => ({
        num: plain(one(p, ".pn", w)),
        title: plain(one(p, "h4", w)),
        text: inline(one(p, "p", w), w),
      })),
    };
    push("about", sectionBase(s, ".about-quote", "about"), content);
  }

  // journey
  {
    const s = secEl("journey");
    const w = "index.html #journey";
    const items: JourneyItem[] = [];
    for (const it of all(s, ".tl-item")) {
      const img = it.querySelector(".tl-logo");
      const title = plain(one(it, ".tl-title", w));
      if (!img) odd(w, `timeline item "${title}" has no logo and uses different markup (kept as logoMediaId=null)`);
      items.push({
        year: plain(one(it, ".tl-year", w)),
        logoMediaId: img ? await registerAsset(img.getAttribute("src")!, img.getAttribute("alt") ?? "", w) : null,
        logoVariant: img ? (variantOf(img, "tl-logo", ["card", "plain", "round"], w) as JourneyItem["logoVariant"]) : null,
        title,
        role: plain(one(it, ".tl-role", w)),
        body: inline(one(it, ".tl-body-in > p", w), w),
        metrics: all(it, ".tl-metrics > div").map((d) => stat(d, w)),
      });
    }
    push("journey", sectionBase(s, ".section-title", "journey"), { items });
  }

  // expertise
  {
    const s = secEl("expertise");
    const w = "index.html #expertise";
    push("expertise", sectionBase(s, ".section-title", "expertise"), {
      cards: all(s, ".exp-card").map((c) => ({
        num: plain(one(c, ".num", w)),
        title: plain(one(c, "h4", w)),
        tags: all(c, ".exp-tags span").map((t) => plain(t)),
      })),
    });
  }

  // work
  {
    const s = secEl("work");
    const projects = [];
    for (const p of all(s, "article.proj")) {
      const id = p.getAttribute("id")!.replace(/^proj-/, "");
      const w = `index.html #proj-${id}`;
      const logo = one(p, ".proj-logo", w);
      const blocks: WorkBlock[] = [];
      for (const b of all(p, ".cs-block")) {
        const title = stripDiamond(plain(one(b, "h5", w)));
        const full = b.classList.contains("cs-full");
        const chips = b.querySelector(".chan-grid");
        const ul = b.querySelector("ul");
        const ps = all(b, "p");
        if (ps.length > 1) odd(w, `block "${title}" has ${ps.length} paragraphs; only the first is kept`);
        if (chips) blocks.push({ kind: "chips", title, full, items: all(chips, "span").map((c) => plain(c)) });
        else if (ul) blocks.push({ kind: "list", title, full, items: all(ul, "li").map((li) => inline(li, w)) });
        else if (ps[0]) blocks.push({ kind: "paragraph", title, full, text: inline(ps[0], w) });
        else odd(w, `block "${title}" is empty`);
      }
      const toggle = one(p, ".proj-toggle", w);
      projects.push({
        id,
        index: plain(one(p, ".proj-index", w)),
        name: plain(one(p, ".proj-name", w)),
        role: plain(one(p, ".proj-role", w)),
        desc: inline(one(p, ".proj-desc", w), w),
        kpis: all(p, ".proj-kpis > div").map((d) => stat(d, w)),
        toggleLabel: plain(toggle, ".ic"),
        logoMediaId: await registerAsset(logo.getAttribute("src")!, logo.getAttribute("alt") ?? "", w),
        logoVariant: variantOf(logo, "proj-logo", ["card", "round", "wide"], w) as "card" | "round" | "wide" | null,
        blocks,
        results: all(p, ".results-band > div").map((d) => stat(d, w)),
      });
    }
    push("work", sectionBase(s, ".section-title", "work"), { projects });
  }

  // playbook
  {
    const s = secEl("playbook");
    const w = "index.html #playbook";
    const steps = all(s, ".pb-step").map((st) => ({
      num: plain(one(st, ".s-n", w)),
      title: plain(one(st, "h4", w)),
      text: inline(one(st, "p", w), w),
    }));
    const nodes = all(s, ".pb-node").length;
    if (nodes !== steps.length) odd(w, `flywheel has ${nodes} hard-coded nodes but ${steps.length} steps`);
    push("playbook", sectionBase(s, ".section-title", "playbook"), {
      steps,
      centerSymbol: plain(one(s, ".pb-center b", w)),
      centerLabel: plain(one(s, ".pb-center small", w)),
    });
  }

  // metrics
  {
    const s = secEl("metrics");
    const w = "index.html #metrics";
    const cells: MetricCell[] = all(s, ".dash-cell").map((c) => {
      const numEl = one(c, ".dash-num", w);
      const count = one(numEl, ".count", w);
      const spans = all(numEl, "span");
      const ci = spans.indexOf(count);
      return {
        prefix: spans.slice(0, ci).map((x) => plain(x)).join(""),
        to: num(count.getAttribute("data-to")!, w),
        decimals: num(count.getAttribute("data-dec") ?? "0", w),
        suffix: spans.slice(ci + 1).map((x) => plain(x)).join(""),
        label: plain(one(c, ".dash-label", w)),
      };
    });
    push("metrics", sectionBase(s, ".section-title", "metrics"), { cells });
  }

  // gallery (tiles + the case-study cover info they carry)
  {
    const s = secEl("gallery");
    const w = "index.html #gallery";
    for (const t of all(s, "a.g-tile")) {
      const slug = (t.getAttribute("href") ?? "").replace(/^case-studies\//, "").replace(/\.html$/, "");
      const img = one(t, "img.lazy-img", `${w} ${slug}`);
      const art = one(t, ".g-art", `${w} ${slug}`);
      const ar = /--ar:\s*(\d+)\s*\/\s*(\d+)/.exec(art.getAttribute("style") ?? "") ?? die(`no --ar for ${slug}`);
      const mediaId = await registerAsset(img.getAttribute("data-src")!, img.getAttribute("alt") ?? "", `${w} ${slug}`);
      const m = mediaById.get(mediaId)!;
      const real = m.width! / m.height!;
      const declared = Number(ar[1]) / Number(ar[2]);
      if (Math.abs(real - declared) / declared > 0.02)
        odd(`${w} ${slug}`, `--ar ${ar[1]}/${ar[2]} (${declared.toFixed(3)}) differs from real image ratio ${real.toFixed(3)}`);
      const noscript = t.querySelector("noscript")?.innerHTML ?? "";
      if (!noscript.includes(img.getAttribute("data-src")!.replace(/&/g, "&amp;")) && !noscript.includes(img.getAttribute("data-src")!))
        odd(`${w} ${slug}`, "noscript fallback image differs from data-src");
      gallery.push({
        slug,
        title: plain(one(t, ".g-meta b", w)),
        label: plain(one(t, ".g-meta span", w)),
        variant: art.classList.contains("logo") ? "logo" : "default",
        aspect: `${ar[1]}/${ar[2]}`,
        mediaId,
        alt: img.getAttribute("alt") ?? "",
        w: m.width!,
        h: m.height!,
      });
    }
    // tiles get title/label overrides later, once the case-study pages are parsed
    push("gallery", sectionBase(s, ".section-title", "gallery"), { tiles: [] });
  }

  // testimonials
  {
    const s = secEl("testimonials");
    const w = "index.html #testimonials";
    push("testimonials", sectionBase(s, ".section-title", "testimonials"), {
      items: all(s, ".tst").map((t) => ({
        quote: inline(one(t, "p", w), w),
        initial: plain(one(t, ".tst-av", w)),
        name: plain(one(t, ".tst-by b", w)),
        role: plain(one(t, ".tst-by small", w)),
      })),
    });
    if (all(s, ".tst").length) odd(w, "testimonials are real-person quotes, sourced as-is; names carry honorifics (Mr.) and avatar initials are stored explicitly");
  }

  // brain
  {
    const s = secEl("brain");
    const w = "index.html #brain";
    const cards: BrainCard[] = all(s, ".brain-card").map((c): BrainCard => {
      const kicker = stripDiamond(plain(one(c, ".bi", w)));
      const title = plain(one(c, "h4", w));
      const arche = c.querySelector(".arche");
      const ul = c.querySelector("ul");
      if (arche)
        return {
          variant: "archetypes",
          kicker,
          title,
          text: inline(one(c, "p", w), w),
          chips: all(arche, "span").map((x) => ({ label: plain(x), on: x.classList.contains("on") })),
        };
      if (ul) return { variant: "list", kicker, title, items: all(ul, "li").map((li) => inline(li, w)) };
      return { variant: "text", kicker, title, text: inline(one(c, "p", w), w) };
    });
    push("brain", sectionBase(s, ".section-title", "brain"), { cards });
  }

  // writing
  {
    const s = secEl("writing");
    const w = "index.html #writing";
    const slugs: string[] = [];
    for (const a of all(s, "a.post")) {
      const slug = (a.getAttribute("href") ?? "").replace(/^articles\//, "").replace(/\.html$/, "");
      const img = one(a, "img", `${w} ${slug}`);
      const rt = /(\d+)\s*min/.exec(plain(one(a, ".post-meta", w)));
      if (!rt) odd(`${w} ${slug}`, "no read time on card");
      slugs.push(slug);
      articleCards.push({
        slug,
        tag: plain(one(a, ".post-cat", w)),
        readTime: rt ? Number(rt[1]) : 5,
        excerpt: inline(one(a, "p", w), w),
        title: plain(one(a, "h4", w)),
        mediaId: await registerAsset(img.getAttribute("src")!, img.getAttribute("alt") ?? "", `${w} ${slug}`),
      });
    }
    push("writing", sectionBase(s, ".section-title", "writing"), { slugs });
  }

  // contact
  {
    const s = secEl("contact");
    push("contact", sectionBase(s, ".contact-big", "contact"), {});
  }

  return { sections, gallery, articleCards };
}

/* ------------------------------------------------------------------ */
/* posts                                                               */
/* ------------------------------------------------------------------ */

function parseBody(body: HTMLElement, where: string): { blocks: Block[]; stoppedAt: number } {
  const blocks: Block[] = [];
  const headings = new Map<string, number>();
  let i = 0;
  const kids = body.childNodes;
  for (; i < kids.length; i++) {
    const n = kids[i];
    if (n.nodeType === NodeType.TEXT_NODE) {
      if (n.text.trim()) odd(where, `loose text outside any element: "${collapse(n.text).slice(0, 60)}"`);
      continue;
    }
    if (!isEl(n)) continue;
    const tag = n.tagName;
    if (tag === "H3" && plain(n) === "Skills demonstrated") break;
    if (tag === "DIV" && (n.classList.contains("cs-skills") || n.classList.contains("cs-takeaway"))) continue;
    if (tag === "H3" || tag === "H4") {
      const text = inline(n, where);
      if (!text) odd(where, `empty <${tag.toLowerCase()}>`);
      headings.set(`${tag}:${text}`, (headings.get(`${tag}:${text}`) ?? 0) + 1);
      blocks.push({ type: "heading", level: tag === "H3" ? 3 : 4, text });
    } else if (tag === "P") {
      const text = inline(n, where);
      if (!text) {
        odd(where, "empty <p> dropped");
        continue;
      }
      if (text.split(/\s+/).length <= 2 && blocks.at(-1)?.type === "list")
        odd(where, `orphan paragraph "${text}" straight after a list (kept as-is)`);
      blocks.push({ type: "paragraph", text });
    } else if (tag === "UL") {
      blocks.push({ type: "list", items: all(n, "li").map((li) => inline(li, where)) });
    } else {
      die(`unexpected <${tag.toLowerCase()}> in ${where}`);
    }
  }
  for (const [k, c] of headings) if (c > 1) odd(where, `heading repeated ${c}x: ${k.replace(":", " ")}`);
  return { blocks: blocks.map((b) => Block.parse(b)), stoppedAt: i };
}

function checkHeadingLevels(blocks: Block[], where: string) {
  const levels = blocks.filter((b) => b.type === "heading").map((b) => (b as { level: number }).level);
  if (levels.includes(4)) {
    const lastH4 = levels.lastIndexOf(4);
    if (levels.slice(lastH4 + 1).includes(3) && levels.indexOf(4) > 0)
      odd(where, "mixed heading levels: h3 sections follow h4 subheadings (kept as-is)");
  }
}

async function parsePost(
  type: "case_study" | "article",
  file: string,
  sortOrder: number,
  extra: { cardLabel: string | null; excerpt: string | null; readTime: number | null; coverMediaId: string | null; cardAspect: string | null },
  expected: { prev: string; next: string },
): Promise<Post> {
  const slug = path.basename(file, ".html");
  const where = `${type === "case_study" ? "case-studies" : "articles"}/${slug}.html`;
  const root = await read(file);
  const title = plain(one(root, "h1.cs-title", where));
  const tagRaw = plain(one(root, ".cs-tag", where));
  const subEl = root.querySelector(".cs-subtitle");
  const subtitle = subEl ? inline(subEl, where) : "";
  if (!subtitle) odd(where, "empty subtitle (no .cs-subtitle text); SEO description in the legacy page fell back to the takeaway");

  const bodyEl = one(root, ".cs-body", where);
  const { blocks, stoppedAt } = parseBody(bodyEl, where);
  checkHeadingLevels(blocks, where);
  if (!blocks.length) odd(where, "empty body");

  const skills = all(bodyEl, ".cs-skills span").map((s) => plain(s));
  if (type === "case_study" && !skills.length) odd(where, 'no "Skills demonstrated" section');
  void stoppedAt;
  const tk = bodyEl.querySelector(".cs-takeaway p");
  const takeaway = tk ? inline(tk, where) : "";
  if (!takeaway) odd(where, "no takeaway callout");
  else if (/^["“”]/.test(takeaway) || /["“”]$/.test(takeaway)) odd(where, "takeaway is wrapped in literal quote characters (kept)");

  const meta = all(root, ".cs-meta > div").map((d) => ({ label: plain(one(d, "b", where)), value: inline(one(d, "span", where), where) }));
  if (type === "case_study" && !meta.length) odd(where, "no meta rows (Brand/Role/Objective)");

  // tag / read time
  let tag = tagRaw;
  let readTime = extra.readTime;
  if (type === "article") {
    const m = /^(.*?)\s*·\s*(\d+) min read$/.exec(tagRaw);
    if (!m) odd(where, `hero tag "${tagRaw}" is not "<category> · N min read"`);
    else {
      tag = m[1];
      if (extra.readTime !== Number(m[2])) odd(where, `read time differs: page says ${m[2]} min, home card says ${extra.readTime}`);
      readTime = Number(m[2]);
    }
  } else if (extra.cardLabel !== tagRaw) {
    odd(where, `hero tag "${tagRaw}" differs from gallery label "${extra.cardLabel}" (tag from page, cardLabel from gallery)`);
  }

  // SEO overrides only when the legacy page did not follow the derivation rules
  const headTitle = plain(one(root, "title", where));
  const derivedTitle = type === "case_study" ? `${title} — Case Study | Khyati Goyal` : `${title} | Khyati Goyal`;
  const seoTitle = headTitle === derivedTitle ? null : headTitle;
  if (seoTitle) odd(where, `<title> "${headTitle}" differs from derived "${derivedTitle}" (stored as seoTitle)`);
  const desc = root.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  const seoDescription = subtitle && collapse(desc) === plain(subEl!) ? null : subtitle ? desc : null;
  if (subtitle && seoDescription) odd(where, "meta description differs from subtitle (stored as seoDescription)");

  // subtitle heuristics
  if (type === "case_study" && subtitle && subtitle.split(/\s+/).length > 8 && !/[.:—–]/.test(subtitle))
    odd(where, "subtitle looks like a concatenated title + subtitle with no separator (kept verbatim)");

  // foot nav
  const nav = all(root, ".cs-foot-nav a.cs-next").map((a) => (a.getAttribute("href") ?? "").replace(/\.html$/, ""));
  if (nav[0] !== expected.prev || nav[1] !== expected.next)
    odd(where, `foot-nav prev/next (${nav.join(" / ")}) differs from derived order (${expected.prev} / ${expected.next})`);

  return {
    id: uuid5(`post:${type}:${slug}`),
    type,
    slug,
    status: "published",
    title,
    subtitle,
    tag,
    cardLabel: extra.cardLabel,
    excerpt: extra.excerpt,
    readTimeMinutes: readTime,
    coverMediaId: extra.coverMediaId,
    cardAspect: extra.cardAspect,
    meta,
    body: blocks,
    skills,
    takeaway,
    seoTitle,
    seoDescription,
    sortOrder,
    publishedAt: null,
  };
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  await fs.rm(OUT_MEDIA, { recursive: true, force: true });
  const root = await read(path.join(LEGACY, "index.html"));
  const settings = await parseSettings(root);
  const { sections, gallery, articleCards } = await parseIndex(root);

  const posts: Post[] = [];
  const cycle = (list: string[], i: number) => ({ prev: list[(i - 1 + list.length) % list.length], next: list[(i + 1) % list.length] });

  const csSlugs = gallery.map((g) => g.slug);
  for (const [i, g] of gallery.entries()) {
    posts.push(
      await parsePost(
        "case_study",
        path.join(LEGACY, "case-studies", `${g.slug}.html`),
        (i + 1) * 10,
        { cardLabel: g.label, excerpt: null, readTime: null, coverMediaId: g.mediaId, cardAspect: g.aspect },
        cycle(csSlugs, i),
      ),
    );
  }
  const artSlugs = articleCards.map((c) => c.slug);
  for (const [i, c] of articleCards.entries()) {
    const p = await parsePost(
      "article",
      path.join(LEGACY, "articles", `${c.slug}.html`),
      (i + 1) * 10,
      { cardLabel: null, excerpt: c.excerpt, readTime: c.readTime, coverMediaId: c.mediaId, cardAspect: null },
      cycle(artSlugs, i),
    );
    if (p.title !== c.title) odd(`articles/${c.slug}.html`, `page title "${p.title}" differs from home card title "${c.title}"`);
    if (p.tag !== c.tag) odd(`articles/${c.slug}.html`, `page category "${p.tag}" differs from home card category "${c.tag}" (using the page value)`);
    posts.push(p);
  }

  // every legacy page must be accounted for
  for (const [dir, slugs] of [["case-studies", csSlugs], ["articles", artSlugs]] as const) {
    const files = (await fs.readdir(path.join(LEGACY, dir))).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""));
    for (const f of files) if (!slugs.includes(f)) odd(`${dir}/${f}.html`, "page exists but is not linked from index.html (NOT imported)");
  }

  // gallery tile overrides (only where the tile differs from the post)
  const galleryTiles = gallery.map((g) => {
    const post = posts.find((p) => p.type === "case_study" && p.slug === g.slug)!;
    if (post.title !== g.title) odd(`index.html #gallery ${g.slug}`, `tile title "${g.title}" differs from page title "${post.title}" (stored as tile override)`);
    return { slug: g.slug, title: post.title === g.title ? null : g.title, label: null, variant: g.variant };
  });
  const gal = sections.find((s) => s.key === "gallery")!;
  if (gal.key === "gallery") gal.content.tiles = galleryTiles;

  // orphan assets
  for (const f of await fs.readdir(ASSETS)) {
    if (/\.(css|js)$/.test(f)) continue;
    if (!usedAssets.has(f)) odd(`assets/${f}`, "asset is not referenced by any imported page (NOT copied)");
  }

  const seed = {
    generatedAt: new Date().toISOString(),
    settings,
    sections,
    posts,
    media: [...mediaById.values()].sort((a, b) => a.path.localeCompare(b.path)),
  };

  const parsed = SeedFile.safeParse(seed);
  if (!parsed.success) {
    console.error("\nseed.json FAILED schema validation:");
    for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }

  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify(parsed.data, null, 2) + "\n");

  const caseStudies = posts.filter((p) => p.type === "case_study").length;
  console.log(`seed.json written: ${sections.length} sections, ${caseStudies} case studies, ${posts.length - caseStudies} articles, ${seed.media.length} media files`);
  console.log(`images copied to ${path.relative(ROOT, OUT_MEDIA)}/`);
  console.log(`\nREPORT (${oddities.length} oddities, nothing was silently fixed):`);
  const seen = new Set<string>();
  for (const o of oddities) {
    const line = `  [${o.where}] ${o.what}`;
    if (seen.has(line)) continue;
    seen.add(line);
    console.log(line);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
});
