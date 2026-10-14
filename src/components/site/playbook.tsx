import type { SectionOf } from "@/lib/schema";
import { Flywheel } from "./flywheel";
import { Inline } from "./inline";
import { SectionHead, SectionShell } from "./section-head";

/** Node positions: evenly spaced around the ring (radius 200/440 of the box), starting at 12 o'clock. */
function nodePositions(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    return { left: +(50 + 45.45 * Math.cos(a)).toFixed(1), top: +(50 + 45.45 * Math.sin(a)).toFixed(1) };
  });
}

export function Playbook({ section }: { section: SectionOf<"playbook"> }) {
  const { steps, centerSymbol, centerLabel } = section.content;
  return (
    <SectionShell id="playbook">
      <SectionHead section={section} />
      <div className="pb-wrap">
        <Flywheel>
          <svg viewBox="0 0 440 440" aria-hidden="true">
            <defs>
              <linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#CDE9BC" />
                <stop offset="1" stopColor="#4C6B44" />
              </linearGradient>
            </defs>
            <circle className="pb-ring" cx="220" cy="220" r="200" />
            <circle className="pb-arc" cx="220" cy="220" r="164" transform="rotate(-90 220 220)" />
          </svg>
          {nodePositions(steps.length).map((p, i) => (
            <span className="pb-node" key={i} style={{ left: `${p.left}%`, top: `${p.top}%` }}></span>
          ))}
          <div className="pb-center">
            <b>{centerSymbol}</b>
            <small>{centerLabel}</small>
          </div>
        </Flywheel>
        <div className="pb-steps reveal d3">
          {steps.map((s) => (
            <div className="pb-step" key={s.num}>
              <div className="s-n">{s.num}</div>
              <div>
                <h4>{s.title}</h4>
                <p>
                  <Inline text={s.text} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
