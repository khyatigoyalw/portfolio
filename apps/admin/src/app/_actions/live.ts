"use server";

import { bust } from "@/lib/revalidate";
import { guarded } from "./guard";

/** Manual "Refresh live site": drops every public cache tag, for when a refresh failed earlier or the DB was edited by hand. */
export async function refreshLiveSite() {
  return guarded(async () => {
    const r = await bust({ settings: true, sections: true, media: true, posts: true });
    if (!r.ok) throw new Error(`The live site could not be refreshed: ${r.error}.`);
    return { message: "Live site refreshed." };
  });
}
