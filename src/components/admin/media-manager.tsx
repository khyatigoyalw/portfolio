"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteMedia, registerMedia, replaceMedia, updateMediaAlt } from "@/app/admin/_actions/media";
import { storageName } from "@/lib/admin/slugify";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/media-url";
import type { Media } from "@/lib/schema";
import { ConfirmButton } from "./save-bar";
import { Thumb, isImage } from "./media-picker";
import { useAction, useToast } from "./toast";

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPT = "image/webp,image/png,image/jpeg,image/gif,image/avif,image/svg+xml,application/pdf";

/** Browser-side: natural size + a ~12px blurred placeholder (data URL). Non-images / SVG return nulls. */
async function inspect(file: File): Promise<{ width: number | null; height: number | null; blur: string | null }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return { width: null, height: null, blur: null };
  try {
    const bmp = await createImageBitmap(file);
    const { width, height } = bmp;
    const scale = 12 / Math.max(width, height);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(width * scale));
    c.height = Math.max(1, Math.round(height * scale));
    c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return { width, height, blur: c.toDataURL("image/jpeg", 0.6) };
  } catch {
    return { width: null, height: null, blur: null }; // e.g. AVIF not decodable in this browser
  }
}

/** Uploads straight to the `media` bucket as the signed-in admin (storage RLS = is_admin()). */
async function upload(file: File) {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
  const path = `uploads/${Date.now().toString(36)}-${storageName(file.name)}`;
  const { error } = await createClient().storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { width, height, blur } = await inspect(file);
  return { path, mime: file.type, width, height, bytes: file.size, blurDataUrl: blur };
}

export function MediaManager({ initial }: { initial: Media[] }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function addFiles(files: FileList | File[]) {
    setBusy(true);
    for (const f of Array.from(files)) {
      try {
        const r = await registerMedia(await upload(f));
        if (r.ok) setItems((x) => [r.media, ...x]);
        else toast("err", r.error);
      } catch (e) {
        toast("err", e instanceof Error ? e.message : "Upload failed.");
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div className={`adm-drop${over ? " over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void addFiles(e.dataTransfer.files); }}>
        <p style={{ margin: "0 0 10px" }}>Drop images or a PDF here (max 15 MB each)</p>
        <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
        <button type="button" className="adm-btn primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : "Choose files"}</button>
      </div>
      <div className="adm-media-grid">
        {items.map((m) => (
          <MediaCard key={m.id} media={m} onChange={(n) => setItems((x) => x.map((y) => (y.id === n.id ? n : y)))} onDeleted={() => setItems((x) => x.filter((y) => y.id !== m.id))} />
        ))}
      </div>
      {!items.length && <p className="adm-muted">No files yet.</p>}
    </>
  );
}

function MediaCard({ media: m, onChange, onDeleted }: { media: Media; onChange: (m: Media) => void; onDeleted: () => void }) {
  const toast = useToast();
  const [alt, setAlt] = useState(m.alt);
  const [replacing, setReplacing] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const saveAlt = useAction(updateMediaAlt, { onOk: () => onChange({ ...m, alt }) });
  const del = useAction(deleteMedia, { onOk: onDeleted });

  async function replace(f: File) {
    setReplacing(true);
    try {
      const r = await replaceMedia(m.id, await upload(f));
      if (r.ok) { onChange(r.media); toast("ok", r.message); } else toast("err", r.error);
    } catch (e) {
      toast("err", e instanceof Error ? e.message : "Replace failed.");
    }
    setReplacing(false);
  }

  return (
    <div className="adm-media">
      <div className="thumb"><Thumb media={m} /></div>
      <div className="meta">
        <a href={mediaUrl(m.path)} target="_blank" rel="noreferrer" style={{ overflowWrap: "anywhere" }}>{m.path}</a>
        <span>{m.width && m.height ? `${m.width}×${m.height} · ` : ""}{m.bytes ? `${Math.round(m.bytes / 1024)} KB` : m.mime}</span>
        {isImage(m) ? (
          <div className="adm-field">
            <label htmlFor={`alt-${m.id}`}>Alt text</label>
            <input id={`alt-${m.id}`} type="text" value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={() => alt !== m.alt && saveAlt.run(m.id, alt)} />
          </div>
        ) : null}
        <div className="adm-actions">
          {isImage(m) && <button type="button" className="adm-btn sm" disabled={saveAlt.pending || alt === m.alt} onClick={() => saveAlt.run(m.id, alt)}>Save alt</button>}
          <input ref={file} type="file" hidden accept={m.mime === "application/pdf" ? "application/pdf" : ACCEPT} onChange={(e) => { const f = e.target.files?.[0]; if (f) void replace(f); e.target.value = ""; }} />
          <button type="button" className="adm-btn sm" disabled={replacing} onClick={() => file.current?.click()}>{replacing ? "Replacing…" : "Replace"}</button>
          <ConfirmButton className="adm-btn sm danger" label="Delete" title="Delete this file?" body={<>“{m.path}” is deleted only if nothing uses it. If it is in use you will be told where.</>} onConfirm={() => del.run(m.id)} disabled={del.pending} />
        </div>
      </div>
    </div>
  );
}
