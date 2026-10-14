"use client";

/**
 * Small controlled-form kit used by every editor. Everything is value/onChange so editors can
 * hold a whole schema-typed object in state and hand it to a Server Action on save.
 */
import { useId, type ReactNode } from "react";
import type { Stat, LinkItem } from "@/lib/schema";

export function Field({ label, hint, id, children, wide }: { label: string; hint?: string; id: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`adm-field${wide ? " wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <p className="adm-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; hint?: string; wide?: boolean };

export function TextInput({ label, hint, wide, value, onChange, mono, required, placeholder, type = "text" }: Common & {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "url" | "email";
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id} wide={wide}>
      <input id={id} type={type} className={mono ? "mono" : undefined} value={value} required={required} placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function NumberInput({ label, hint, wide, value, onChange, min, max }: Common & {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id} wide={wide}>
      <input id={id} type="number" step="any" min={min} max={max} value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
    </Field>
  );
}

export function TextArea({ label, hint, wide = true, value, onChange, rows = 4, mono }: Common & {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id} wide={wide}>
      <textarea id={id} rows={rows} className={mono ? "mono" : undefined} value={value}
        aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SelectField<T extends string>({ label, hint, wide, value, onChange, options }: Common & {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[] | readonly T[];
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id} wide={wide}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          return (
            <option key={v} value={v}>
              {typeof o === "string" ? o : o.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="adm-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Fieldset({ legend, children, grid = true }: { legend: string; children: ReactNode; grid?: boolean }) {
  return (
    <fieldset className="adm-fs">
      <legend>{legend}</legend>
      {grid ? <div className="adm-grid">{children}</div> : children}
    </fieldset>
  );
}

/** Move item i by delta (-1 up, +1 down); returns a new array. */
export function move<T>(list: readonly T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= list.length) return [...list];
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Repeated, orderable items: add / remove / move up / move down. */
export function ListEditor<T>({ label, items, onChange, create, render, title, addLabel = "Add item", min = 0 }: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, set: (next: T) => void, index: number) => ReactNode;
  title?: (item: T, index: number) => string;
  addLabel?: string;
  min?: number;
}) {
  const set = (i: number, v: T) => onChange(items.map((x, k) => (k === i ? v : x)));
  return (
    <div role="group" aria-label={label} className="wide" style={{ gridColumn: "1/-1" }}>
      <div className="adm-legend" style={{ marginBottom: 8 }}>{label} <span className="adm-muted">({items.length})</span></div>
      <div className="adm-list">
        {items.map((item, i) => (
          <div className="adm-item" key={i}>
            <div className="adm-item-head">
              <b>{title ? title(item, i) || `${label} ${i + 1}` : `${label} ${i + 1}`}</b>
              <button type="button" className="adm-btn sm icon ghost" onClick={() => onChange(move(items, i, -1))} disabled={i === 0} aria-label={`Move ${label} ${i + 1} up`}>↑</button>
              <button type="button" className="adm-btn sm icon ghost" onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1} aria-label={`Move ${label} ${i + 1} down`}>↓</button>
              <button type="button" className="adm-btn sm icon danger ghost" onClick={() => onChange(items.filter((_, k) => k !== i))} disabled={items.length <= min} aria-label={`Remove ${label} ${i + 1}`}>✕</button>
            </div>
            <div className="adm-item-body">{render(item, (v) => set(i, v), i)}</div>
          </div>
        ))}
      </div>
      <button type="button" className="adm-btn sm" onClick={() => onChange([...items, create()])}>+ {addLabel}</button>
    </div>
  );
}

/** A list of plain strings, one input per row. */
export function StringList({ label, items, onChange, addLabel = "Add", multiline, hint }: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const base = useId();
  return (
    <div role="group" aria-label={label} style={{ gridColumn: "1/-1" }}>
      <div className="adm-legend" style={{ marginBottom: 6 }}>{label}</div>
      {hint && <p className="adm-hint" style={{ marginBottom: 6 }}>{hint}</p>}
      <div className="adm-list" style={{ gap: 8 }}>
        {items.map((s, i) => (
          <div className="adm-inline-row" key={i} style={{ alignItems: multiline ? "flex-start" : "center" }}>
            {multiline ? (
              <textarea id={`${base}-${i}`} aria-label={`${label} ${i + 1}`} rows={3} value={s} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
            ) : (
              <input id={`${base}-${i}`} type="text" aria-label={`${label} ${i + 1}`} value={s} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
            )}
            <button type="button" className="adm-btn sm icon ghost" onClick={() => onChange(move(items, i, -1))} disabled={i === 0} aria-label={`Move ${label} ${i + 1} up`}>↑</button>
            <button type="button" className="adm-btn sm icon ghost" onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1} aria-label={`Move ${label} ${i + 1} down`}>↓</button>
            <button type="button" className="adm-btn sm icon danger ghost" onClick={() => onChange(items.filter((_, k) => k !== i))} aria-label={`Remove ${label} ${i + 1}`}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" className="adm-btn sm" onClick={() => onChange([...items, ""])}>+ {addLabel}</button>
    </div>
  );
}

/** Stat = { value, label } pairs (hero chips, KPIs, results band, journey metrics). */
export function StatList({ label, items, onChange }: { label: string; items: Stat[]; onChange: (v: Stat[]) => void }) {
  return (
    <ListEditor label={label} items={items} onChange={onChange} create={() => ({ value: "", label: "" })} addLabel="Add stat"
      title={(s) => [s.value, s.label].filter(Boolean).join(" · ")}
      render={(s, set) => (
        <div className="adm-grid">
          <TextInput label="Value" value={s.value} onChange={(value) => set({ ...s, value })} />
          <TextInput label="Label" value={s.label} onChange={(l) => set({ ...s, label: l })} />
        </div>
      )} />
  );
}

export function LinkEditor({ label, value, onChange }: { label: string; value: LinkItem; onChange: (v: LinkItem) => void }) {
  return (
    <Fieldset legend={label}>
      <TextInput label="Label" value={value.label} onChange={(l) => onChange({ ...value, label: l })} />
      <TextInput label="Link" mono value={value.href} onChange={(href) => onChange({ ...value, href })} hint='"#about", "/case-studies/x", "https://…", "mailto:…"' />
    </Fieldset>
  );
}
