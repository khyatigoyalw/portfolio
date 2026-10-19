"use server";

import { SiteSettings } from "@portfolio/core/schema";
import { settingsToRow } from "@portfolio/core/mappers";
import { bust, bustWarning } from "@/lib/revalidate";
import { check, guarded } from "./guard";

export async function saveSettings(input: unknown) {
  return guarded(async (db) => {
    const settings = SiteSettings.parse(input);
    const { error } = await db.from("site_settings").upsert(settingsToRow(settings));
    check(error, "Saving settings");
    const live = bustWarning(await bust({ settings: true, media: true }));
    return { ...live, message: "Settings saved. The live site is updated." };
  });
}
