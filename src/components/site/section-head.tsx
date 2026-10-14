import type { Section } from "@/lib/schema";
import { Inline } from "./inline";

export function SectionHead({ section }: { section: Pick<Section, "eyebrow" | "heading" | "intro"> }) {
  return (
    <>
      <span className="eyebrow reveal">{section.eyebrow}</span>
      <h2 className="section-title reveal d1">
        <Inline text={section.heading} />
      </h2>
      {section.intro && (
        <p className="lead reveal d2">
          <Inline text={section.intro} />
        </p>
      )}
    </>
  );
}

/** <section.section id=…><div.wrap>…</div></section> */
export function SectionShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section className="section" id={id}>
      <div className="wrap">{children}</div>
    </section>
  );
}

/** Staggered reveal delay class (d1, d2, d3, d1, …) used by card grids. */
export const delay = (i: number) => `d${(i % 3) + 1}`;
