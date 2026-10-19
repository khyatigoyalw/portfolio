import type { Metadata } from "next";
import { gate } from "@/components/gate";
import { MediaProvider } from "@/components/media-picker";
import { PasswordForm } from "@/components/password-form";
import { SettingsForm } from "@/components/settings-form";
import { loadMedia, loadSettings } from "@/lib/queries";

export const metadata: Metadata = { title: "Profile & settings" };

export default async function Page() {
  const g = await gate();
  if (!g.ok) return g.view;
  const [settings, media] = await Promise.all([loadSettings(g.db), loadMedia(g.db)]);
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Profile &amp; settings</h1>
          <p>Hero, navigation, marquee, contact details, footer and SEO. Saving updates the live site immediately.</p>
        </div>
      </div>
      {/* Above the settings form: its sticky save bar must stay the last thing on the page. */}
      <details className="adm-card">
        <summary><h2 style={{ display: "inline" }}>Change password</h2></summary>
        <div style={{ marginTop: 16 }}>
          <PasswordForm />
        </div>
      </details>
      <MediaProvider media={media}>
        <SettingsForm initial={settings} />
      </MediaProvider>
    </>
  );
}
