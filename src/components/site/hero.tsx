import { resolveMedia } from "@/lib/data";
import type { SiteSettings } from "@/lib/schema";
import { HeroShell } from "./hero-shell";
import { Inline } from "./inline";

export async function Hero({ settings }: { settings: SiteSettings }) {
  const { hero } = settings;
  const resume = await resolveMedia(settings.resumeMediaId);
  return (
    <HeroShell>
      <div className="wrap">
        <span className="hero-hi">{hero.hiLine}</span>
        <h1>
          {hero.headlineLines.map((line, i) => (
            <span className="l" key={i}>
              <span>
                <Inline text={line} />
              </span>
            </span>
          ))}
        </h1>
        <p className="hero-sub">
          <Inline text={hero.sub} />
        </p>
        <div className="hero-tags">
          {hero.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="hero-cta">
          {hero.ctas.map((c) => {
            const cls = `btn ${c.style === "primary" ? "btn-primary" : "btn-ghost"}`;
            const label = (
              <>
                {c.label}
                {c.icon && (
                  <>
                    {" "}
                    <span className="arr">{c.icon}</span>
                  </>
                )}
              </>
            );
            if (c.isResume) {
              if (!resume) return null;
              return (
                <a key={c.label} id="resumeBtn" href={resume.src} download={c.downloadName ?? true} className={cls}>
                  {label}
                </a>
              );
            }
            return (
              <a key={c.label} href={c.href} className={cls}>
                {label}
              </a>
            );
          })}
        </div>
        <div className="hero-stats">
          {hero.stats.map((s) => (
            <div className="chip" key={s.label}>
              <b>{s.value}</b>
              <small>{s.label}</small>
            </div>
          ))}
        </div>
        <div className="scroll-cue">
          <span className="bar"></span>
          {hero.scrollCue}
        </div>
      </div>
    </HeroShell>
  );
}
