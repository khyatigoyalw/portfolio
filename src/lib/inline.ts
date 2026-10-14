/**
 * Tiny inline markup used by every free-text field in the content model.
 *
 *   **bold**   *italic*   ==highlight==   [label](url)   "\n" = line break   \x = literal x
 *
 * `==highlight==` renders as <span class="beige"> (the hero headline accent).
 * The parser is pure (no React) so server components, client components and
 * scripts can all share it. Unterminated markers are kept as literal text.
 */
export type InlineNode =
  | { t: "text"; v: string }
  | { t: "br" }
  | { t: "strong" | "em" | "mark"; c: InlineNode[] }
  | { t: "link"; href: string; c: InlineNode[] };

export function parseInline(src: string): InlineNode[] {
  let i = 0;

  function run(stop: string | null): InlineNode[] {
    const out: InlineNode[] = [];
    let buf = "";
    const flush = () => {
      if (buf) out.push({ t: "text", v: buf });
      buf = "";
    };
    const wrap = (delim: string, t: "strong" | "em" | "mark"): boolean => {
      const start = i;
      i += delim.length;
      const c = run(delim);
      if (src.startsWith(delim, i)) {
        i += delim.length;
        flush();
        out.push({ t, c });
        return true;
      }
      i = start;
      return false;
    };

    while (i < src.length) {
      if (stop && src.startsWith(stop, i)) break;
      const ch = src[i];
      if (ch === "\\" && i + 1 < src.length) {
        buf += src[i + 1];
        i += 2;
        continue;
      }
      if (ch === "\n") {
        flush();
        out.push({ t: "br" });
        i++;
        continue;
      }
      if (ch === "*" && src.startsWith("**", i) && stop !== "**") {
        if (wrap("**", "strong")) continue;
        buf += "**";
        i += 2;
        continue;
      }
      if (ch === "*" && stop !== "*") {
        if (wrap("*", "em")) continue;
        buf += "*";
        i += 1;
        continue;
      }
      if (ch === "=" && src.startsWith("==", i) && stop !== "==") {
        if (wrap("==", "mark")) continue;
        buf += "==";
        i += 2;
        continue;
      }
      if (ch === "[" && stop !== "]") {
        const start = i;
        i += 1;
        const c = run("]");
        if (src.startsWith("](", i)) {
          const end = src.indexOf(")", i + 2);
          if (end !== -1) {
            const href = src.slice(i + 2, end);
            i = end + 1;
            flush();
            out.push({ t: "link", href, c });
            continue;
          }
        }
        i = start;
        buf += "[";
        i += 1;
        continue;
      }
      buf += ch;
      i++;
    }
    flush();
    return out;
  }

  return run(null);
}

/** Strip markup, e.g. for meta descriptions and alt text. */
export function inlineToPlain(src: string): string {
  const walk = (nodes: InlineNode[]): string =>
    nodes
      .map((n) => {
        if (n.t === "text") return n.v;
        if (n.t === "br") return " ";
        return walk(n.c);
      })
      .join("");
  return walk(parseInline(src)).replace(/\s+/g, " ").trim();
}

/** Escape literal text so it survives parseInline unchanged. */
export function escapeInline(text: string): string {
  return text.replace(/([\\*\[\]])/g, "\\$1").replace(/==/g, "\\=\\=");
}
