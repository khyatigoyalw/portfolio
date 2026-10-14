"use client";

import type { Block } from "@/lib/schema";
import { move, SelectField, TextArea, TextInput } from "./fields";
import { MediaField } from "./media-picker";

const KINDS: { type: Block["type"]; label: string }[] = [
  { type: "heading", label: "Heading" },
  { type: "paragraph", label: "Paragraph" },
  { type: "list", label: "List" },
  { type: "image", label: "Image" },
  { type: "quote", label: "Quote" },
];

const blank = (type: Block["type"]): Block => {
  switch (type) {
    case "heading": return { type, level: 3, text: "" };
    case "paragraph": return { type, text: "" };
    case "list": return { type, items: [""] };
    case "image": return { type, mediaId: "", caption: "" };
    case "quote": return { type, text: "", cite: "" };
  }
};

/** Post body: add / reorder / delete heading, paragraph, list, image and quote blocks. */
export function BlockEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const set = (i: number, b: Block) => onChange(blocks.map((x, k) => (k === i ? b : x)));
  return (
    <div role="group" aria-label="Body blocks">
      <div className="adm-list">
        {blocks.map((b, i) => (
          <div className="adm-item" key={i}>
            <div className="adm-item-head">
              <b>{i + 1}. {KINDS.find((k) => k.type === b.type)?.label}{"text" in b && b.text ? `: ${b.text.slice(0, 50)}` : ""}</b>
              <button type="button" className="adm-btn sm icon ghost" disabled={i === 0} onClick={() => onChange(move(blocks, i, -1))} aria-label={`Move block ${i + 1} up`}>↑</button>
              <button type="button" className="adm-btn sm icon ghost" disabled={i === blocks.length - 1} onClick={() => onChange(move(blocks, i, 1))} aria-label={`Move block ${i + 1} down`}>↓</button>
              <button type="button" className="adm-btn sm icon danger ghost" onClick={() => onChange(blocks.filter((_, k) => k !== i))} aria-label={`Delete block ${i + 1}`}>✕</button>
            </div>
            <div className="adm-item-body">
              {b.type === "heading" && (
                <div className="adm-grid">
                  <SelectField label="Level" value={String(b.level) as "3" | "4"} onChange={(l) => set(i, { ...b, level: l === "3" ? 3 : 4 })} options={[{ value: "3", label: "Heading (h3)" }, { value: "4", label: "Sub-heading (h4)" }] as const} />
                  <TextInput label="Text" value={b.text} onChange={(text) => set(i, { ...b, text })} />
                </div>
              )}
              {b.type === "paragraph" && <TextArea label="Text" rows={5} value={b.text} onChange={(text) => set(i, { ...b, text })} hint="**bold**, *italic*, [label](url)" />}
              {b.type === "list" && <TextArea label="Items" rows={5} value={b.items.join("\n")} onChange={(v) => set(i, { ...b, items: v.split("\n") })} hint="One bullet per line. Inline markup allowed. Empty lines are dropped on save." />}
              {b.type === "image" && (
                <div className="adm-grid">
                  <MediaField label="Image" value={b.mediaId || null} onChange={(id) => set(i, { ...b, mediaId: id ?? "" })} />
                  <TextInput label="Caption" value={b.caption ?? ""} onChange={(caption) => set(i, { ...b, caption })} />
                </div>
              )}
              {b.type === "quote" && (
                <div className="adm-grid">
                  <TextArea label="Quote" rows={3} value={b.text} onChange={(text) => set(i, { ...b, text })} />
                  <TextInput label="Attribution" value={b.cite ?? ""} onChange={(cite) => set(i, { ...b, cite })} />
                </div>
              )}
            </div>
          </div>
        ))}
        {!blocks.length && <p className="adm-muted">No content yet. Add a block below.</p>}
      </div>
      <div className="adm-actions">
        <span className="adm-muted">Add:</span>
        {KINDS.map((k) => (
          <button type="button" key={k.type} className="adm-btn sm" onClick={() => onChange([...blocks, blank(k.type)])}>+ {k.label}</button>
        ))}
      </div>
    </div>
  );
}
