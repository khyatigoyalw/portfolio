"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "http://localhost:3000";

const LINKS = [
  { href: "/", label: "Overview", exact: true },
  { href: "/messages", label: "Messages" },
  { href: "/settings", label: "Profile & settings" },
  { href: "/sections", label: "Home sections" },
  { href: "/case-studies", label: "Case studies" },
  { href: "/articles", label: "Articles" },
  { href: "/media", label: "Media" },
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
      <a href={CLIENT_URL} target="_blank" rel="noreferrer">
        View site ↗
      </a>
    </nav>
  );
}
