"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Scroll-reveal (.reveal -> .in) and the offset smooth-scroll for in-page anchors. Mounted once in the site layout. */
export function SiteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // 12% of a very tall block (the gallery as one column on phones) can exceed the viewport,
          // so also reveal once it fills a quarter of the screen.
          if (e.isIntersecting && (e.intersectionRatio >= 0.12 || e.intersectionRect.height >= window.innerHeight * 0.25)) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: [0, 0.05, 0.12, 0.25], rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const id = a.getAttribute("href") ?? "";
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 20, behavior: reduce ? "auto" : "smooth" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
