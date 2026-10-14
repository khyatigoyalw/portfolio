import type { SectionOf } from "@/lib/schema";
import { MetricsGrid } from "./metrics";
import { SectionHead, SectionShell } from "./section-head";

export function Metrics({ section }: { section: SectionOf<"metrics"> }) {
  return (
    <SectionShell id="metrics">
      <SectionHead section={section} />
      <MetricsGrid cells={section.content.cells} />
    </SectionShell>
  );
}
