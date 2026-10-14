import { getSettings } from "@/lib/data";
import "@/app/(site)/site.css";
import "@/app/(site)/post.css";
import { Footer } from "./footer";
import { Nav } from "./nav";
import { SiteEffects } from "./site-effects";

/** Ambient background + nav + footer around every public page (also used by the root not-found page). */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <div className="bg-atmos" aria-hidden="true">
        <div className="glow g1"></div>
        <div className="glow g2"></div>
        <div className="glow g3"></div>
      </div>
      <Nav name={settings.name} links={settings.nav.links} cta={settings.nav.cta} />
      {children}
      <Footer settings={settings} />
      <SiteEffects />
    </>
  );
}
