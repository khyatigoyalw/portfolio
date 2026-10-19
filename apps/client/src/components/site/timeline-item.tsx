"use client";

import { useState } from "react";

/** One accordion chapter of the journey timeline. `head` is the button content, children the body. */
export function TimelineItem({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`tl-item${open ? " open" : ""}`}>
      <button className="tl-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {head}
      </button>
      <div className="tl-body">
        <div className="tl-body-in">{children}</div>
      </div>
    </div>
  );
}
