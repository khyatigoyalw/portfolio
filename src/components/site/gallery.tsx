import Link from "next/link";
import { getPosts, resolveMedia } from "@/lib/data";
import type { ResolvedMedia, SectionOf } from "@/lib/schema";
import { MediaImage } from "./media-image";
import { SectionHead, SectionShell } from "./section-head";

/* Collage layout: each tile spans cells of a 4:3 grid by its cover's shape. */
type Shape = "sq" | "tall" | "wide" | "big";
const SPAN: Record<Shape, [cols: number, rows: number]> = { sq: [1, 1], tall: [1, 2], wide: [2, 1], big: [2, 2] };
const CELL = 4 / 3;
const COLS = 4; // desktop column count

function ratio(m: ResolvedMedia | null) {
  return m?.width && m.height ? m.width / m.height : CELL;
}

function shapeFor(r: number): Shape {
  if (r < 1) return "tall";
  if (r < 1.6) return "sq";
  if (r < 2.2) return "big";
  return "wide";
}

/** Shape of a tile in cells, counting the gap as roughly 1/20 of a cell. */
function tileRatio(s: Shape) {
  const [c, r] = SPAN[s];
  return ((c + (c - 1) * 0.05) * CELL) / (r + (r - 1) * 0.05);
}

const misfit = (s: Shape, r: number) => Math.abs(Math.log(tileRatio(s) / r));

const SHAPES = Object.keys(SPAN) as Shape[];
const spansOf = (shapes: Shape[], cols: number) => shapes.map((s) => [Math.min(SPAN[s][0], cols), SPAN[s][1]] as [number, number]);
const costOf = (shapes: Shape[], ratios: number[]) => shapes.reduce((n, s, i) => n + misfit(s, ratios[i]), 0);

/**
 * Keep each tile's shape if the grid packs without gaps; otherwise change the one or two tiles
 * whose photos suffer least so every row is full.
 */
function fill(base: Shape[], ratios: number[], cols: number): Shape[] {
  const gapless = (sh: Shape[]) => !hasHoles(spansOf(sh, cols), cols);
  if (gapless(base)) return base;
  const best = { shapes: base, cost: Infinity };
  const consider = (sh: Shape[]) => {
    const cost = costOf(sh, ratios);
    if (cost < best.cost && gapless(sh)) Object.assign(best, { shapes: [...sh], cost });
  };
  for (let i = 0; i < base.length; i++) {
    for (const a of SHAPES) {
      if (a === base[i]) continue;
      const one = [...base];
      one[i] = a;
      consider(one);
      for (let j = i + 1; j < base.length; j++) {
        for (const b of SHAPES) {
          if (b === base[j]) continue;
          const two = [...one];
          two[j] = b;
          consider(two);
        }
      }
    }
  }
  return best.shapes;
}

/** Place tiles like `grid-auto-flow: dense` and report whether any cell is left empty. */
function hasHoles(spans: [number, number][], cols: number) {
  const used: boolean[][] = [];
  const free = (r: number, c: number) => !used[r]?.[c];
  for (const [w, h] of spans) {
    for (let r = 0, placed = false; !placed; r++) {
      for (let c = 0; c + w <= cols && !placed; c++) {
        let ok = true;
        for (let y = r; y < r + h && ok; y++) for (let x = c; x < c + w && ok; x++) ok = free(y, x);
        if (!ok) continue;
        for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) (used[y] ??= [])[x] = true;
        placed = true;
      }
    }
  }
  return used.some((row) => Array.from({ length: cols }, (_, c) => row?.[c]).some((x) => !x));
}

export async function Gallery({ section }: { section: SectionOf<"gallery"> }) {
  const posts = new Map((await getPosts("case_study")).map((p) => [p.slug, p]));
  const tiles = (
    await Promise.all(
      section.content.tiles.map(async (t) => {
        const post = posts.get(t.slug);
        if (!post) return null;
        return { t, post, cover: await resolveMedia(post.coverMediaId) };
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);
  const ratios = tiles.map(({ cover }) => ratio(cover));
  const shapes = fill(ratios.map(shapeFor), ratios, COLS);
  const phone = fill(shapes, ratios, 2); // phones use 2 columns; a tile may take another shape there

  return (
    <SectionShell id="gallery">
      <SectionHead section={section} />
      <div className="gallery-wrap reveal d2">
        <div className="gallery">
          {tiles.map(({ t, post, cover }, i) => {
            const shape = shapes[i];
            // Fill the tile when the photo is close to its shape; otherwise show it whole over a blurred copy.
            const fitsIn = (s: Shape) => t.variant !== "logo" && misfit(s, ratios[i]) <= 0.4;
            const fits = fitsIn(shape);
            const m = phone[i] === shape ? "" : ` g-m-${phone[i]} g-m-${fitsIn(phone[i]) ? "cover" : "contain"}`;
            const sizes = SPAN[shape][0] === 2 || SPAN[phone[i]][0] === 2 ? "(max-width: 780px) 100vw, 560px" : "(max-width: 780px) 50vw, 280px";
            return (
              <Link href={`/case-studies/${post.slug}`} className={`g-tile g-${shape}${fits ? "" : " g-contain"}${m}`} key={post.slug}>
                {(!fits || m.endsWith("contain")) && <MediaImage media={cover} alt="" className="g-bg" sizes={sizes} />}
                <MediaImage media={cover} className="g-fg" sizes={sizes} />
                <div className="g-meta">
                  <b>{t.title ?? post.title}</b>
                  <span>{t.label ?? post.cardLabel ?? post.tag}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
