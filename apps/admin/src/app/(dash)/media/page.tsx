import type { Metadata } from "next";
import { gate } from "@/components/gate";
import { MediaManager } from "@/components/media-manager";
import { loadMedia } from "@/lib/queries";

export const metadata: Metadata = { title: "Media" };

export default async function Page() {
  const g = await gate();
  if (!g.ok) return g.view;
  const media = await loadMedia(g.db);
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Media</h1>
          <p>Images and the résumé PDF. Replacing a file updates every place that uses it.</p>
        </div>
      </div>
      <MediaManager initial={media} />
    </>
  );
}
