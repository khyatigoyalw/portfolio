"use client";

import { useEffect, useState } from "react";

/** <header.hero>: adds .loaded (text reveal) and .draw (curve animation) after the page has loaded. */
export function HeroShell({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [draw, setDraw] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onLoad = () => {
      setLoaded(true);
      if (!reduce) setDraw(true);
    };
    const t = setTimeout(() => setLoaded(true), 200);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => {
      clearTimeout(t);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <header className={`hero${loaded ? " loaded" : ""}`} id="top">
      <svg
        className={`hero-curve${draw ? " draw" : ""}`}
        id="heroCurve"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hg" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#4C6B44" />
            <stop offset="1" stopColor="#CDE9BC" />
          </linearGradient>
        </defs>
        <path className="line" d="M-40,760 C240,740 380,700 560,610 C740,520 840,470 1000,330 C1140,210 1260,150 1500,80" />
        <circle cx="560" cy="610" r="6" />
        <circle cx="1000" cy="330" r="6" />
        <circle cx="1260" cy="150" r="6" />
        <circle cx="300" cy="722" r="6" />
      </svg>
      {children}
    </header>
  );
}
