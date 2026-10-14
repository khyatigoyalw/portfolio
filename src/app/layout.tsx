import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, Space_Mono } from "next/font/google";
import "./(site)/tokens.css";

// Fonts are bound to CSS variables that tokens.css maps onto --font-display / --font-sans / --font-mono.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--f-fraunces",
});
// Manrope is loaded as the same discrete weights the legacy page requested (so e.g. font-weight:350 resolves to 300, as before).
const manrope = Manrope({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], display: "swap", variable: "--f-manrope" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], display: "swap", variable: "--f-space-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Khyati Goyal",
};

export const viewport: Viewport = { themeColor: "#0A0C0A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${fraunces.variable} ${manrope.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
