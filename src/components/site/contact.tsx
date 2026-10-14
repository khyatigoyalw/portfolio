import type { SectionOf, SiteContact } from "@/lib/schema";
import { Inline } from "./inline";

export function Contact({ section, contact }: { section: SectionOf<"contact">; contact: SiteContact }) {
  return (
    <section className="section" id="contact">
      <div className="wrap contact-inner">
        <span className="eyebrow reveal" style={{ marginInline: "auto" }}>
          {section.eyebrow}
        </span>
        <h2 className="contact-big reveal d1">
          <Inline text={section.heading} />
        </h2>
        {section.intro && (
          <p className="lead reveal d2" style={{ marginInline: "auto", textAlign: "center" }}>
            <Inline text={section.intro} />
          </p>
        )}
        <div className="contact-links reveal d2">
          <a className="c-link" href={`mailto:${contact.email}`}>
            <span className="ci">✉</span> {contact.email}
          </a>
          <a className="c-link" href={contact.linkedinUrl} target="_blank" rel="noopener">
            <span className="ci">in</span> {contact.linkedinLabel}
          </a>
          <a className="c-link" href={`tel:${contact.phone}`}>
            <span className="ci">☎</span> {contact.phoneDisplay}
          </a>
        </div>
        {contact.availability && (
          <div className="c-avail reveal d3">
            <span className="live"></span>
            {contact.availability}
          </div>
        )}
      </div>
    </section>
  );
}
