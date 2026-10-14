import type { Metadata } from "next";
import { gate } from "@/components/admin/gate";
import { SectionsList } from "@/components/admin/sections-list";
import { loadSections } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Home sections" };

export default async function Page() {
  const g = await gate();
  if (!g.ok) return g.view;
  const sections = await loadSections(g.db);
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Home sections</h1>
          <p>Show or hide each block of the home page, reorder them, and open one to edit its content.</p>
        </div>
      </div>
      <SectionsList initial={sections.map((s) => ({ key: s.key, heading: s.heading, eyebrow: s.eyebrow, visible: s.visible }))} />
    </>
  );
}
