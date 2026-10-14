import type { SectionOf } from "@/lib/schema";
import { Inline } from "./inline";
import { delay, SectionHead, SectionShell } from "./section-head";

export function Testimonials({ section }: { section: SectionOf<"testimonials"> }) {
  return (
    <SectionShell id="testimonials">
      <SectionHead section={section} />
      <div className="tst-grid">
        {section.content.items.map((t, i) => (
          <div className={`tst reveal ${delay(i)}`} key={`${t.name}-${i}`}>
            <div className="qm">&quot;</div>
            <p>
              <Inline text={t.quote} />
            </p>
            <div className="tst-by">
              <div className="tst-av">{t.initial}</div>
              <div>
                <b>{t.name}</b>
                <small>{t.role}</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
