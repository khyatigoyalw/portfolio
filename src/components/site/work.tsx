import { resolveMedia } from "@/lib/data";
import type { SectionOf, WorkBlock } from "@/lib/schema";
import { Inline } from "./inline";
import { MediaImage } from "./media-image";
import { ProjectShell, ProjectToggle } from "./project-shell";
import { SectionHead, SectionShell } from "./section-head";

function Block({ block }: { block: WorkBlock }) {
  return (
    <div className={`cs-block${block.full ? " cs-full" : ""}`}>
      <h5>◆ {block.title}</h5>
      {block.kind === "paragraph" && (
        <p>
          <Inline text={block.text} />
        </p>
      )}
      {block.kind === "list" && (
        <ul>
          {block.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      )}
      {block.kind === "chips" && (
        <div className="chan-grid">
          {block.items.map((it) => (
            <span key={it}>{it}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export async function Work({ section }: { section: SectionOf<"work"> }) {
  const projects = await Promise.all(
    section.content.projects.map(async (p) => ({ p, logo: await resolveMedia(p.logoMediaId) })),
  );
  return (
    <SectionShell id="work">
      <SectionHead section={section} />
      {projects.map(({ p, logo }) => (
        <ProjectShell key={p.id} id={`proj-${p.id}`}>
          <div className="proj-head">
            <div className="proj-head-l">
              <div className="proj-index">{p.index}</div>
              <h2 className="proj-name">{p.name}</h2>
              <div className="proj-role">{p.role}</div>
              <p className="proj-desc">
                <Inline text={p.desc} />
              </p>
              <div className="proj-kpis">
                {p.kpis.map((k) => (
                  <div key={k.label}>
                    <b>{k.value}</b>
                    <small>{k.label}</small>
                  </div>
                ))}
              </div>
              <ProjectToggle label={p.toggleLabel} />
            </div>
            <div className="proj-visual">
              <div className="mock">
                <MediaImage
                  media={logo}
                  className={`proj-logo${p.logoVariant ? ` proj-logo--${p.logoVariant}` : ""}`}
                  sizes="420px"
                />
              </div>
            </div>
          </div>
          <div className="proj-detail">
            <div className="proj-detail-in">
              <div className="cs-grid">
                {p.blocks.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </div>
              <div className="results-band">
                {p.results.map((r) => (
                  <div key={r.label}>
                    <b>{r.value}</b>
                    <small>{r.label}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ProjectShell>
      ))}
    </SectionShell>
  );
}
