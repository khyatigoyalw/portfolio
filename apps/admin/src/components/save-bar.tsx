"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** Sticky bottom bar: dirty hint + primary save button (+ extra buttons). Warns before leaving with unsaved edits. */
export function SaveBar({ pending, dirty, label = "Save changes", children }: { pending: boolean; dirty: boolean; label?: string; children?: ReactNode }) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  return (
    <div className="adm-savebar">
      <button className="adm-btn primary" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>
      {children}
      <span className="grow" />
      {dirty && !pending && <span className="adm-dirty" role="status">Unsaved changes</span>}
    </div>
  );
}

/** Modal confirm built on <dialog> (focus trapped by the browser, Esc cancels). */
export function ConfirmButton({ label, title, body, confirmLabel = "Delete", onConfirm, disabled, className = "adm-btn danger" }: {
  label: string;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const tid = useId();
  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} className="adm-dialog narrow" aria-labelledby={tid}>
        <h2 id={tid} style={{ marginBottom: 10 }}>{title}</h2>
        <div style={{ marginBottom: 18 }} className="adm-muted">{body}</div>
        <div className="adm-actions">
          <button type="button" className="adm-btn danger" onClick={() => { ref.current?.close(); onConfirm(); }}>{confirmLabel}</button>
          <button type="button" className="adm-btn" autoFocus onClick={() => ref.current?.close()}>Cancel</button>
        </div>
      </dialog>
    </>
  );
}

/** JSON-compare helper for dirty tracking. */
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
