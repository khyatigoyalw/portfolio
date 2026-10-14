"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/settings", label: "Profile & settings" },
  { href: "/admin/sections", label: "Home sections" },
  { href: "/admin/case-studies", label: "Case studies" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/media", label: "Media" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="Admin">
      {LINKS.map((l) => {
        const active = l.exact ? path === l.href : path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noreferrer">
        View site ↗
      </a>
    </nav>
  );
}
