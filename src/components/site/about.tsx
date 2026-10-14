import { resolveMedia } from "@/lib/data";
import type { SectionOf } from "@/lib/schema";
import { Inline } from "./inline";
import { MediaImage } from "./media-image";
import { SectionShell } from "./section-head";

export async function About({ section }: { section: SectionOf<"about"> }) {
  const { content } = section;
  const portrait = await resolveMedia(content.portraitMediaId);
  return (
    <SectionShell id="about">
      <span className="eyebrow reveal">{section.eyebrow}</span>
      <div className="about-grid">
        <div className="about-portrait reveal">
          <div className="frame">
            <MediaImage media={portrait} sizes="(max-width: 980px) 420px, 600px" />
          </div>
          <div className="about-badge">
            <b>{content.badge.value}</b>
            <small>{content.badge.label}</small>
          </div>
        </div>
        <div className="reveal d1">
          <h2 className="about-quote">
            <Inline text={section.heading} />
          </h2>
          <div className="about-body">
            {content.paragraphs.map((p, i) => (
              <p key={i}>
                <Inline text={p} />
              </p>
            ))}
          </div>
          <div className="pillars">
            {content.pillars.map((p) => (
              <div className="pillar" key={p.num}>
                <div className="pn">{p.num}</div>
                <h4>{p.title}</h4>
                <p>
                  <Inline text={p.text} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
