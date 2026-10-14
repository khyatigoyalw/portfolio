"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Media } from "@/lib/schema";
import { mediaUrl } from "@/lib/media-url";

const MediaCtx = createContext<Media[]>([]);

/** Gives every MediaField below it the full media library (loaded by the server page). */
export function MediaProvider({ media, children }: { media: Media[]; children: React.ReactNode }) {
  return <MediaCtx.Provider value={media}>{children}</MediaCtx.Provider>;
}
export const useMediaList = () => useContext(MediaCtx);

export const isImage = (m: Pick<Media, "mime">) => m.mime.startsWith("image/");

export function Thumb({ media }: { media: Pick<Media, "path" | "mime" | "alt"> }) {
  if (!media.mime.startsWith("image/")) return <span>{media.mime.split("/")[1]?.toUpperCase() ?? "FILE"}</span>;
  // eslint-disable-next-line @next/next/no-img-element -- admin previews arbitrary storage files; no optimisation needed
  return <img src={mediaUrl(media.path)} alt={media.alt} loading="lazy" />;
}

/** Field showing the current file with Choose / Clear; opens a grid dialog to pick from the library. */
export function MediaField({ label, value, onChange, kind = "image", hint }: {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  kind?: "image" | "pdf";
  hint?: string;
}) {
  const all = useMediaList();
  const list = useMemo(() => all.filter((m) => (kind === "pdf" ? m.mime === "application/pdf" : isImage(m))), [all, kind]);
  const current = all.find((m) => m.id === value) ?? null;
  const dlg = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const shown = list.filter((m) => `${m.path} ${m.alt}`.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const close = () => setQ("");
    d.addEventListener("close", close);
    return () => d.removeEventListener("close", close);
  }, []);

  return (
    <div className="adm-field" style={{ gridColumn: "span 1" }}>
      <span className="adm-legend">{label}</span>
      <div className="adm-picker-btn">
        <div className="thumb">{current ? <Thumb media={current} /> : "none"}</div>
        <div className="adm-actions">
          <button type="button" className="adm-btn sm" onClick={() => dlg.current?.showModal()}>{current ? "Change" : "Choose"}</button>
          {current && <button type="button" className="adm-btn sm ghost" onClick={() => onChange(null)}>Clear</button>}
        </div>
      </div>
      <p className="adm-hint">{current ? current.path : value ? "File missing from library" : hint ?? "Upload new files under Media."}</p>
      <dialog ref={dlg} className="adm-dialog" aria-label={`Choose ${label}`}>
        <div className="adm-head" style={{ marginBottom: 12 }}>
          <h2>Choose {kind === "pdf" ? "a PDF" : "an image"}</h2>
          <div className="adm-actions">
            <input type="search" aria-label="Search files" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 180 }} />
            <button type="button" className="adm-btn sm" onClick={() => dlg.current?.close()}>Close</button>
          </div>
        </div>
        <div className="adm-media-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", overflowY: "auto", maxHeight: "60vh" }}>
          {shown.map((m) => (
            <button type="button" key={m.id} className="adm-pick" aria-pressed={m.id === value} onClick={() => { onChange(m.id); dlg.current?.close(); }}>
              <div className="thumb"><Thumb media={m} /></div>
              <span title={m.path}>{m.path}</span>
            </button>
          ))}
          {!shown.length && <p className="adm-muted">Nothing found. Upload files under Media.</p>}
        </div>
      </dialog>
    </div>
  );
}
