import type { Section, SiteSettings } from "@/lib/schema";
import { About } from "./about";
import { Brain } from "./brain";
import { Contact } from "./contact";
import { Expertise } from "./expertise";
import { Gallery } from "./gallery";
import { Journey } from "./journey";
import { Metrics } from "./metrics-section";
import { Playbook } from "./playbook";
import { Testimonials } from "./testimonials";
import { Work } from "./work";
import { Writing } from "./writing";

/** Renders one home-page section by key. Hidden sections render nothing. */
export function SectionView({ section, settings }: { section: Section; settings: SiteSettings }) {
  if (!section.visible) return null;
  switch (section.key) {
    case "about":
      return <About section={section} />;
    case "journey":
      return <Journey section={section} />;
    case "expertise":
      return <Expertise section={section} />;
    case "work":
      return <Work section={section} />;
    case "playbook":
      return <Playbook section={section} />;
    case "metrics":
      return <Metrics section={section} />;
    case "gallery":
      return <Gallery section={section} />;
    case "testimonials":
      return <Testimonials section={section} />;
    case "brain":
      return <Brain section={section} />;
    case "writing":
      return <Writing section={section} />;
    case "contact":
      return <Contact section={section} contact={settings.contact} />;
  }
}
