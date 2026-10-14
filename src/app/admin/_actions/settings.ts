"use server";

import { SiteSettings } from "@/lib/schema";
import { settingsToRow } from "@/lib/mappers";
import { bust } from "@/lib/admin/revalidate";
import { check, guarded } from "./guard";

export async function saveSettings(input: unknown) {
  return guarded(async (db) => {
    const settings = SiteSettings.parse(input);
    const { error } = await db.from("site_settings").upsert(settingsToRow(settings));
    check(error, "Saving settings");
    bust({ settings: true, media: true });
    return { message: "Settings saved. The live site is updated." };
  });
}
