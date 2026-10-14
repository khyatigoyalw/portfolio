"use client";

/** Expertise card with the cursor-following glow (sets --mx/--my on mouse move). */
export function GlowCard({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div
      className={className}
      onMouseMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}
