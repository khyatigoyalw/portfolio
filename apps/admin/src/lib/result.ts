import type { ZodError } from "zod";

/** What every admin Server Action returns. */
export type ActionResult<T = object> = ({ ok: true; message: string } & T) | { ok: false; error: string };

/** "hero.ctas.0.label: Too small…" lines, readable in a toast. */
export function formatZod(err: ZodError, max = 5): string {
  const lines = err.issues.slice(0, max).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
  if (err.issues.length > max) lines.push(`…and ${err.issues.length - max} more`);
  return lines.join("\n");
}
