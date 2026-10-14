import type { SectionOf } from "@/lib/schema";
import { Inline } from "./inline";
import { delay, SectionHead, SectionShell } from "./section-head";

export function Brain({ section }: { section: SectionOf<"brain"> }) {
  return (
    <SectionShell id="brain">
      <SectionHead section={section} />
      <div className="brain-grid">
        {section.content.cards.map((c, i) => (
          <div className={`brain-card reveal ${delay(i)}`} key={`${c.title}-${i}`}>
            <div className="bi">◆ {c.kicker}</div>
            <h4>{c.title}</h4>
            {c.variant === "list" && (
              <ul>
                {c.items.map((it, j) => (
                  <li key={j}>
                    <Inline text={it} />
                  </li>
                ))}
              </ul>
            )}
            {c.variant === "archetypes" && (
              <>
                <p>
                  <Inline text={c.text} />
                </p>
                <div className="arche">
                  {c.chips.map((chip) => (
                    <span key={chip.label} className={chip.on ? "on" : undefined}>
                      {chip.label}
                    </span>
                  ))}
                </div>
              </>
            )}
            {c.variant === "text" && (
              <p>
                <Inline text={c.text} />
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
