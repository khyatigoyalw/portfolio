import type { SiteSettings } from "@/lib/schema";
import { BrandMark } from "./brand";

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer>
      <div className="wrap foot-inner">
        <BrandMark name={settings.name} />
        <p>{settings.footerTagline}</p>
        <a href="#top" className="to-top">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
