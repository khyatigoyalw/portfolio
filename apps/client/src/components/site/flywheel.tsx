"use client";

import { useEffect, useRef, useState } from "react";

/** Flywheel ring: draws the arc (adds .in) the first time it scrolls into view. */
export function Flywheel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`pb-flywheel reveal d2${inView ? " in" : ""}`} id="flywheel" ref={ref}>
      {children}
    </div>
  );
}
