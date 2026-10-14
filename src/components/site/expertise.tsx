import type { SectionOf } from "@/lib/schema";
import { GlowCard } from "./glow-card";
import { delay, SectionHead, SectionShell } from "./section-head";

export function Expertise({ section }: { section: SectionOf<"expertise"> }) {
  return (
    <SectionShell id="expertise">
      <SectionHead section={section} />
      <div className="exp-groups">
        {section.content.cards.map((c, i) => (
          <GlowCard className={`exp-card reveal ${delay(i)}`} key={c.num}>
            <div className="num">{c.num}</div>
            <h4>{c.title}</h4>
            <div className="exp-tags">
              {c.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </GlowCard>
        ))}
      </div>
    </SectionShell>
  );
}
