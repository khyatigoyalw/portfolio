"use client";

import { useEffect, useRef, useState } from "react";
import type { MetricCell } from "@/lib/schema";

/** The "by the numbers" dashboard; counters count up (cubic ease-out, 1.6s) the first time it is visible. */
export function MetricsGrid({ cells }: { cells: MetricCell[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // null = not started (renders the legacy "0"), 0..1 = eased progress
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const run = () => {
      if (reduce) return setProgress(1);
      let start: number | null = null;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / 1600, 1);
        setProgress(1 - Math.pow(1 - p, 3));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="dash reveal d2" id="dash" ref={ref}>
      {cells.map((c, i) => (
        <div className="dash-cell" key={i}>
          <div className="dash-num">
            {c.prefix && <span className="u">{c.prefix}</span>}
            <span className="count">{progress === null ? "0" : (c.to * progress).toFixed(c.decimals)}</span>
            <span className="u">{c.suffix}</span>
          </div>
          <div className="dash-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
