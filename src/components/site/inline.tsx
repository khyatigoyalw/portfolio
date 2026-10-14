import { Fragment } from "react";
import { parseInline, type InlineNode } from "@/lib/inline";

function nodes(list: InlineNode[]): React.ReactNode {
  return list.map((n, i) => {
    switch (n.t) {
      case "text":
        return <Fragment key={i}>{n.v}</Fragment>;
      case "br":
        return <br key={i} />;
      case "strong":
        return <strong key={i}>{nodes(n.c)}</strong>;
      case "em":
        return <em key={i}>{nodes(n.c)}</em>;
      case "mark":
        return (
          <span key={i} className="beige">
            {nodes(n.c)}
          </span>
        );
      case "link": {
        const external = /^(https?:)?\/\//.test(n.href);
        return (
          <a key={i} href={n.href} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
            {nodes(n.c)}
          </a>
        );
      }
    }
  });
}

/** Renders the tiny inline markup (**bold**, *italic*, ==highlight==, [label](url), "\n") used by every free-text field. */
export function Inline({ text }: { text: string }) {
  return <>{nodes(parseInline(text))}</>;
}
