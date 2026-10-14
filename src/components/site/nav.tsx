"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LinkItem } from "@/lib/schema";
import { BrandMark } from "./brand";

/**
 * Sticky nav + burger + mobile menu. On the home page links are in-page anchors; on every other page
 * they point back at "/#section" (and "Work" lands on the gallery, as the legacy sub-pages did).
 */
export function Nav({ name, links, cta }: { name: string; links: LinkItem[]; cta: LinkItem }) {
  const pathname = usePathname();
  const home = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);
  const hrefFor = (href: string) => (home || !href.startsWith("#") ? href : `/${href === "#work" ? "#gallery" : href}`);
  const renderLink = (l: LinkItem, className?: string) => {
    const href = hrefFor(l.href);
    return href.startsWith("#") ? (
      <a key={l.href} href={href} className={className} onClick={close}>
        {l.label}
      </a>
    ) : (
      <Link key={l.href} href={href} className={className} onClick={close}>
        {l.label}
      </Link>
    );
  };

  return (
    <>
      <nav className={`nav${scrolled ? " scrolled" : ""}`} id="nav">
        <div className="nav-inner">
          <BrandMark name={name} />
          <div className="nav-links">{links.map((l) => renderLink(l))}</div>
          {renderLink(cta, "nav-cta")}
          <button
            className={`nav-burger${open ? " open" : ""}`}
            id="burger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
      <div className={`mobile-menu${open ? " open" : ""}`} id="mobileMenu">
        {links.map((l) => renderLink(l))}
        {renderLink(cta)}
      </div>
    </>
  );
}
