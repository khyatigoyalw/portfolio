"use server";

import { z } from "zod";
import { SECTION_KEYS, Section, SectionKey } from "@/lib/schema";
import { sectionToRow } from "@/lib/mappers";
import { bust } from "@/lib/admin/revalidate";
import { check, guarded } from "./guard";

/** Full section (key, texts, visible, sortOrder, content) validated by the discriminated union. */
export async function saveSection(input: unknown) {
  return guarded(async (db) => {
    const section = Section.parse(input);
    const { error } = await db.from("sections").upsert(sectionToRow(section));
    check(error, "Saving section");
    bust({ sections: true, media: true });
    return { message: `“${section.key}” saved.` };
  });
}

export async function setSectionVisible(key: unknown, visible: unknown) {
  return guarded(async (db) => {
    const k = SectionKey.parse(key);
    const v = z.boolean().parse(visible);
    const { error } = await db.from("sections").update({ visible: v }).eq("key", k);
    check(error, "Updating visibility");
    bust({ sections: true });
    return { message: `“${k}” is now ${v ? "visible" : "hidden"}.` };
  });
}

/** Persist a new order: keys in display order -> sort_order 10, 20, 30… */
export async function reorderSections(keys: unknown) {
  return guarded(async (db) => {
    const list = z.array(SectionKey).length(SECTION_KEYS.length).parse(keys);
    if (new Set(list).size !== list.length) throw new Error("Duplicate section keys.");
    for (const [i, key] of list.entries()) {
      const { error } = await db.from("sections").update({ sort_order: (i + 1) * 10 }).eq("key", key);
      check(error, "Reordering sections");
    }
    bust({ sections: true });
    return { message: "Section order saved." };
  });
}
