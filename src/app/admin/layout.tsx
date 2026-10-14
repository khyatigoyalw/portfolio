import type { Metadata } from "next";
import { Fraunces, Manrope, Space_Mono } from "next/font/google";
import { ToastProvider } from "@/components/admin/toast";
import "./admin.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--adm-fraunces", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--adm-manrope", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--adm-mono", display: "swap" });

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`adm ${fraunces.variable} ${manrope.variable} ${mono.variable}`}>
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
