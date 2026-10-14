"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const Ctx = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} });

/**
 * <article.proj>: toggles .open for the case-study accordion. The class is toggled on the DOM node
 * (not through className) so it can't clobber the .in class that the scroll-reveal adds.
 */
export function ProjectShell({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    ref.current?.classList.toggle("open", open);
  }, [open]);
  return (
    <Ctx.Provider value={{ open, toggle: () => setOpen((o) => !o) }}>
      <article className="proj reveal d1" id={id} ref={ref}>
        {children}
      </article>
    </Ctx.Provider>
  );
}

export function ProjectToggle({ label }: { label: string }) {
  const { open, toggle } = useContext(Ctx);
  return (
    <button className="proj-toggle" aria-expanded={open} onClick={toggle}>
      {open ? "Close case study " : `${label} `}
      <span className="ic">{open ? "↑" : "↓"}</span>
    </button>
  );
}
