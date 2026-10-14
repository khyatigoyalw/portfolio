"use client";

import { useState } from "react";
import { saveSettings } from "@/app/admin/_actions/settings";
import type { HeroCta, SiteSettings } from "@/lib/schema";
import { Check, Fieldset, LinkEditor, ListEditor, SelectField, StatList, StringList, TextArea, TextInput } from "./fields";
import { MediaField } from "./media-picker";
import { SaveBar, same } from "./save-bar";
import { useAction } from "./toast";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState(initial);
  const { run, pending } = useAction(saveSettings, { onOk: () => setSaved(s) });
  const hero = s.hero;
  const setHero = (patch: Partial<SiteSettings["hero"]>) => setS({ ...s, hero: { ...hero, ...patch } });
  const setContact = (patch: Partial<SiteSettings["contact"]>) => setS({ ...s, contact: { ...s.contact, ...patch } });
  const newCta = (): HeroCta => ({ label: "", href: "", style: "ghost", isResume: false });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run(s); }}>
      <Fieldset legend="Brand">
        <TextInput label="Name" value={s.name} onChange={(name) => setS({ ...s, name })} required hint="Shown in the nav and footer; the last word is bolded." />
        <TextInput label="Footer tagline" value={s.footerTagline} onChange={(footerTagline) => setS({ ...s, footerTagline })} />
        <MediaField label="Résumé file" kind="pdf" value={s.resumeMediaId} onChange={(resumeMediaId) => setS({ ...s, resumeMediaId })} hint="Used by any hero button marked “Résumé download”." />
      </Fieldset>

      <Fieldset legend="Hero" grid={false}>
        <div className="adm-grid">
          <TextInput label="Greeting line" value={hero.hiLine} onChange={(hiLine) => setHero({ hiLine })} required />
          <TextInput label="Scroll cue" value={hero.scrollCue} onChange={(scrollCue) => setHero({ scrollCue })} />
          <TextArea label="Sub-heading" value={hero.sub} rows={3} onChange={(sub) => setHero({ sub })} hint="Inline markup: **bold**, *italic*, [label](url)." />
          <StringList label="Headline lines" items={hero.headlineLines} onChange={(headlineLines) => setHero({ headlineLines })} addLabel="Add line" hint="One entry per animated line. *…* = italic, ==…== = beige accent." />
          <StringList label="Tags" items={hero.tags} onChange={(tags) => setHero({ tags })} addLabel="Add tag" />
          <ListEditor label="Buttons" items={hero.ctas} onChange={(ctas) => setHero({ ctas })} create={newCta} addLabel="Add button" title={(c) => c.label}
            render={(c, set) => (
              <div className="adm-grid">
                <TextInput label="Label" value={c.label} onChange={(label) => set({ ...c, label })} />
                <TextInput label="Link" mono value={c.href} onChange={(href) => set({ ...c, href })} hint={c.isResume ? "Ignored: links to the résumé file." : undefined} />
                <SelectField label="Style" value={c.style} onChange={(style) => set({ ...c, style })} options={["primary", "ghost"] as const} />
                <TextInput label="Icon glyph" value={c.icon ?? ""} onChange={(icon) => set({ ...c, icon: icon || undefined })} placeholder="↗" />
                <Check label="Résumé download" checked={c.isResume} onChange={(isResume) => set({ ...c, isResume })} />
                {c.isResume && <TextInput label="Download file name" value={c.downloadName ?? ""} onChange={(downloadName) => set({ ...c, downloadName: downloadName || undefined })} />}
              </div>
            )} />
          <StatList label="Stat chips" items={hero.stats} onChange={(stats) => setHero({ stats })} />
        </div>
      </Fieldset>

      <Fieldset legend="Navigation" grid={false}>
        <div className="adm-grid">
          <ListEditor label="Nav links" items={s.nav.links} onChange={(links) => setS({ ...s, nav: { ...s.nav, links } })} create={() => ({ label: "", href: "" })} addLabel="Add link" title={(l) => l.label}
            render={(l, set) => (
              <div className="adm-grid">
                <TextInput label="Label" value={l.label} onChange={(label) => set({ ...l, label })} />
                <TextInput label="Link" mono value={l.href} onChange={(href) => set({ ...l, href })} />
              </div>
            )} />
          <div style={{ gridColumn: "1/-1" }}>
            <LinkEditor label="Nav button" value={s.nav.cta} onChange={(cta) => setS({ ...s, nav: { ...s.nav, cta } })} />
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Marquee">
        <StringList label="Marquee items" items={s.marquee} onChange={(marquee) => setS({ ...s, marquee })} addLabel="Add item" hint="Listed once; the site repeats them for the loop." />
      </Fieldset>

      <Fieldset legend="Contact">
        <TextInput label="Email" type="email" value={s.contact.email} onChange={(email) => setContact({ email })} required />
        <TextInput label="LinkedIn URL" type="url" value={s.contact.linkedinUrl} onChange={(linkedinUrl) => setContact({ linkedinUrl })} required />
        <TextInput label="LinkedIn label" value={s.contact.linkedinLabel} onChange={(linkedinLabel) => setContact({ linkedinLabel })} required />
        <TextInput label="Phone (tel: form)" mono value={s.contact.phone} onChange={(phone) => setContact({ phone })} required hint="+917060935925" />
        <TextInput label="Phone (display)" value={s.contact.phoneDisplay} onChange={(phoneDisplay) => setContact({ phoneDisplay })} required />
        <TextInput label="Availability line" wide value={s.contact.availability} onChange={(availability) => setContact({ availability })} />
      </Fieldset>

      <Fieldset legend="SEO & social sharing">
        <TextInput label="Page title" wide value={s.siteTitle} onChange={(siteTitle) => setS({ ...s, siteTitle })} required />
        <TextArea label="Meta description" rows={3} value={s.seoDescription} onChange={(seoDescription) => setS({ ...s, seoDescription })} />
        <TextInput label="Open Graph title" value={s.ogTitle ?? ""} onChange={(v) => setS({ ...s, ogTitle: (v || null) })} hint="Blank = use page title." />
        <TextInput label="Open Graph description" value={s.ogDescription ?? ""} onChange={(v) => setS({ ...s, ogDescription: (v || null) })} hint="Blank = use meta description." />
      </Fieldset>

      <SaveBar pending={pending} dirty={!same(s, saved)} />
    </form>
  );
}
