"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/result";

type Toast = { id: number; kind: "ok" | "err"; text: string };
type Push = (kind: Toast["kind"], text: string) => void;
const Ctx = createContext<Push>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback<Push>((kind, text) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 9000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      {/* aria-live so screen readers announce results */}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast${t.kind === "err" ? " err" : ""}`} role={t.kind === "err" ? "alert" : undefined}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

/**
 * Run a Server Action with a pending flag and a toast for its result.
 *   const { run, pending } = useAction(saveSettings, { onOk: (r) => … });
 *   run(payload)
 */
export function useAction<A extends unknown[], R extends ActionResult<object>>(
  action: (...args: A) => Promise<R>,
  opts: { onOk?: (r: Extract<R, { ok: true }>) => void; silent?: boolean } = {},
) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const { onOk, silent } = opts;
  const run = useMemo(
    () =>
      (...args: A) =>
        start(async () => {
          try {
            const r = await action(...args);
            if (r.ok) {
              if (!silent && r.message) toast("ok", r.message);
              onOk?.(r as Extract<R, { ok: true }>);
            } else toast("err", r.error);
          } catch (e) {
            toast("err", e instanceof Error ? e.message : "Request failed.");
          }
        }),
    [action, onOk, silent, toast],
  );
  return { run, pending };
}
