import { resolveMedia } from "@/lib/data";
import type { SectionOf } from "@/lib/schema";
import { Inline } from "./inline";
import { MediaImage } from "./media-image";
import { SectionHead, SectionShell } from "./section-head";
import { TimelineItem } from "./timeline-item";

export async function Journey({ section }: { section: SectionOf<"journey"> }) {
  const items = await Promise.all(
    section.content.items.map(async (it) => ({ it, logo: await resolveMedia(it.logoMediaId) })),
  );
  return (
    <SectionShell id="journey">
      <SectionHead section={section} />
      <div className="timeline reveal d2">
        {items.map(({ it, logo }) => {
          const main = (
            <span className="tl-main">
              <span className="tl-title">{it.title}</span>{" "}
              <span className="tl-role">{it.role}</span>
            </span>
          );
          return (
            <TimelineItem
              key={`${it.year}-${it.title}`}
              head={
                <>
                  <span className="tl-year">{it.year}</span>
                  {logo ? (
                    <span className="tl-brand">
                      <MediaImage
                        media={logo}
                        className={`tl-logo${it.logoVariant ? ` tl-logo--${it.logoVariant}` : ""}`}
                        sizes="180px"
                      />
                      {main}
                    </span>
                  ) : (
                    main
                  )}
                  <span className="tl-plus">+</span>
                </>
              }
            >
              <p>
                <Inline text={it.body} />
              </p>
              <div className="tl-metrics">
                {it.metrics.map((m) => (
                  <div key={m.label}>
                    <b>{m.value}</b>
                    <small>{m.label}</small>
                  </div>
                ))}
              </div>
            </TimelineItem>
          );
        })}
      </div>
    </SectionShell>
  );
}
