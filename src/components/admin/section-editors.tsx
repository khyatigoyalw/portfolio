"use client";

/**
 * One tiny editor per home-section `content` shape (see schema.ts). They share the generic
 * field kit, so each is a handful of lines; <SectionForm> wraps them with the common
 * eyebrow / heading / intro / visible fields and the save action.
 */
import { useState } from "react";
import { saveSection } from "@/app/admin/_actions/sections";
import type {
  AboutContent, BrainCard, BrainContent, ExpertiseContent, GalleryContent, JourneyContent, MetricsContent,
  PlaybookContent, Section, TestimonialsContent, WorkBlock, WorkContent, WritingContent,
} from "@/lib/schema";
import { Check, Fieldset, ListEditor, SelectField, StatList, StringList, TextArea, TextInput, NumberInput } from "./fields";
import { MediaField } from "./media-picker";
import { SaveBar, same } from "./save-bar";
import { useAction } from "./toast";

type Ed<T> = { value: T; onChange: (v: T) => void };
export type SlugOption = { slug: string; title: string };

const grid = (c: React.ReactNode) => <div className="adm-grid">{c}</div>;

function About({ value: v, onChange }: Ed<AboutContent>) {
  return grid(<>
    <MediaField label="Portrait" value={v.portraitMediaId} onChange={(portraitMediaId) => onChange({ ...v, portraitMediaId })} />
    <TextInput label="Badge value" value={v.badge.value} onChange={(value) => onChange({ ...v, badge: { ...v.badge, value } })} />
    <TextInput label="Badge label" value={v.badge.label} onChange={(label) => onChange({ ...v, badge: { ...v.badge, label } })} />
    <StringList label="Paragraphs" multiline items={v.paragraphs} onChange={(paragraphs) => onChange({ ...v, paragraphs })} addLabel="Add paragraph" hint="Inline markup: **bold**, *italic*, [label](url)." />
    <ListEditor label="Pillars" items={v.pillars} onChange={(pillars) => onChange({ ...v, pillars })} create={() => ({ num: String(v.pillars.length + 1).padStart(2, "0"), title: "", text: "" })} title={(p) => p.title}
      render={(p, set) => grid(<>
        <TextInput label="Number" value={p.num} onChange={(num) => set({ ...p, num })} />
        <TextInput label="Title" value={p.title} onChange={(title) => set({ ...p, title })} />
        <TextArea label="Text" rows={3} value={p.text} onChange={(text) => set({ ...p, text })} />
      </>)} />
  </>);
}

function Journey({ value: v, onChange }: Ed<JourneyContent>) {
  return grid(
    <ListEditor label="Chapters" items={v.items} onChange={(items) => onChange({ items })} addLabel="Add chapter" title={(i) => `${i.year} ${i.title}`}
      create={() => ({ year: "", logoMediaId: null, logoVariant: null, title: "", role: "", body: "", metrics: [] })}
      render={(it, set) => grid(<>
        <TextInput label="Years" value={it.year} onChange={(year) => set({ ...it, year })} hint="2022 → 2023" />
        <TextInput label="Title" value={it.title} onChange={(title) => set({ ...it, title })} />
        <TextInput label="Role" value={it.role} onChange={(role) => set({ ...it, role })} />
        <MediaField label="Logo" value={it.logoMediaId} onChange={(logoMediaId) => set({ ...it, logoMediaId })} />
        <SelectField label="Logo style" value={it.logoVariant ?? ""} onChange={(x) => set({ ...it, logoVariant: x === "" ? null : x })}
          options={[{ value: "", label: "No logo" }, { value: "card", label: "Card" }, { value: "plain", label: "Plain" }, { value: "round", label: "Round" }] as const} />
        <TextArea label="Description" rows={4} value={it.body} onChange={(body) => set({ ...it, body })} />
        <StatList label="Metrics" items={it.metrics} onChange={(metrics) => set({ ...it, metrics })} />
      </>)} />,
  );
}

function Expertise({ value: v, onChange }: Ed<ExpertiseContent>) {
  return grid(
    <ListEditor label="Cards" items={v.cards} onChange={(cards) => onChange({ cards })} addLabel="Add card" title={(c) => c.title}
      create={() => ({ num: String(v.cards.length + 1).padStart(2, "0"), title: "", tags: [] })}
      render={(c, set) => grid(<>
        <TextInput label="Number" value={c.num} onChange={(num) => set({ ...c, num })} />
        <TextInput label="Title" value={c.title} onChange={(title) => set({ ...c, title })} />
        <StringList label="Tags" items={c.tags} onChange={(tags) => set({ ...c, tags })} addLabel="Add tag" />
      </>)} />,
  );
}

const newBlock = (kind: WorkBlock["kind"]): WorkBlock =>
  kind === "paragraph" ? { kind, title: "", full: false, text: "" } : kind === "list" ? { kind, title: "", full: false, items: [] } : { kind, title: "", full: false, items: [] };

function Work({ value: v, onChange }: Ed<WorkContent>) {
  return grid(
    <ListEditor label="Projects" items={v.projects} onChange={(projects) => onChange({ projects })} addLabel="Add project" title={(p) => p.name}
      create={() => ({ id: `project-${v.projects.length + 1}`, index: "", name: "", role: "", desc: "", kpis: [], toggleLabel: "Read the full case study", logoMediaId: null, logoVariant: null, blocks: [], results: [] })}
      render={(p, set) => grid(<>
        <TextInput label="Name" value={p.name} onChange={(name) => set({ ...p, name })} />
        <TextInput label="Anchor id" mono value={p.id} onChange={(id) => set({ ...p, id })} hint="Lowercase letters, digits, dashes. Link target #proj-<id>." />
        <TextInput label="Index line" value={p.index} onChange={(index) => set({ ...p, index })} hint="01 — Health & Wellness · D2C" />
        <TextInput label="Role" value={p.role} onChange={(role) => set({ ...p, role })} />
        <TextInput label="Toggle label" value={p.toggleLabel} onChange={(toggleLabel) => set({ ...p, toggleLabel })} />
        <MediaField label="Logo" value={p.logoMediaId} onChange={(logoMediaId) => set({ ...p, logoMediaId })} />
        <SelectField label="Logo style" value={p.logoVariant ?? ""} onChange={(x) => set({ ...p, logoVariant: x === "" ? null : x })}
          options={[{ value: "", label: "No logo" }, { value: "card", label: "Card" }, { value: "round", label: "Round" }, { value: "wide", label: "Wide" }] as const} />
        <TextArea label="Summary" rows={3} value={p.desc} onChange={(desc) => set({ ...p, desc })} />
        <StatList label="KPIs" items={p.kpis} onChange={(kpis) => set({ ...p, kpis })} />
        <ListEditor label="Detail blocks" items={p.blocks} onChange={(blocks) => set({ ...p, blocks })} create={() => newBlock("paragraph")} addLabel="Add block" title={(b) => `${b.kind}: ${b.title}`}
          render={(b, setB) => grid(<>
            <SelectField label="Kind" value={b.kind} onChange={(kind) => setB({ ...newBlock(kind), title: b.title, full: b.full })} options={["paragraph", "list", "chips"] as const} />
            <TextInput label="Title" value={b.title} onChange={(title) => setB({ ...b, title })} />
            <Check label="Full width" checked={b.full} onChange={(full) => setB({ ...b, full })} />
            {b.kind === "paragraph" ? (
              <TextArea label="Text" rows={4} value={b.text} onChange={(text) => setB({ ...b, text })} />
            ) : (
              <StringList label={b.kind === "list" ? "Bullets" : "Chips"} items={b.items} onChange={(items) => setB({ ...b, items })} />
            )}
          </>)} />
        <StatList label="Results band" items={p.results} onChange={(results) => set({ ...p, results })} />
      </>)} />,
  );
}

function Playbook({ value: v, onChange }: Ed<PlaybookContent>) {
  return grid(<>
    <TextInput label="Centre symbol" value={v.centerSymbol} onChange={(centerSymbol) => onChange({ ...v, centerSymbol })} />
    <TextInput label="Centre label" value={v.centerLabel} onChange={(centerLabel) => onChange({ ...v, centerLabel })} />
    <ListEditor label="Steps" items={v.steps} onChange={(steps) => onChange({ ...v, steps })} addLabel="Add step" title={(s) => s.title}
      create={() => ({ num: String(v.steps.length + 1).padStart(2, "0"), title: "", text: "" })}
      render={(s, set) => grid(<>
        <TextInput label="Number" value={s.num} onChange={(num) => set({ ...s, num })} />
        <TextInput label="Title" value={s.title} onChange={(title) => set({ ...s, title })} />
        <TextArea label="Text" rows={3} value={s.text} onChange={(text) => set({ ...s, text })} />
      </>)} />
  </>);
}

function Metrics({ value: v, onChange }: Ed<MetricsContent>) {
  return grid(
    <ListEditor label="Metrics" items={v.cells} onChange={(cells) => onChange({ cells })} addLabel="Add metric" title={(c) => `${c.prefix}${c.to}${c.suffix} ${c.label}`}
      create={() => ({ prefix: "", to: 0, decimals: 0, suffix: "", label: "" })}
      render={(c, set) => grid(<>
        <TextInput label="Prefix" value={c.prefix} onChange={(prefix) => set({ ...c, prefix })} hint="₹, - or blank" />
        <NumberInput label="Count up to" value={c.to} onChange={(to) => set({ ...c, to: to ?? 0 })} />
        <NumberInput label="Decimals" min={0} max={3} value={c.decimals} onChange={(d) => set({ ...c, decimals: Math.round(d ?? 0) })} />
        <TextInput label="Suffix" value={c.suffix} onChange={(suffix) => set({ ...c, suffix })} hint="L+, K+, ×, %" />
        <TextInput label="Label" value={c.label} onChange={(label) => set({ ...c, label })} />
      </>)} />,
  );
}

function Gallery({ value: v, onChange, options }: Ed<GalleryContent> & { options: SlugOption[] }) {
  return grid(
    <ListEditor label="Tiles" items={v.tiles} onChange={(tiles) => onChange({ tiles })} addLabel="Add tile" title={(t) => t.title ?? options.find((o) => o.slug === t.slug)?.title ?? t.slug}
      create={() => ({ slug: options[0]?.slug ?? "", title: null, label: null, variant: "default" as const })}
      render={(t, set) => grid(<>
        <SelectField label="Case study" value={t.slug} onChange={(slug) => set({ ...t, slug })}
          options={options.some((o) => o.slug === t.slug) ? options.map((o) => ({ value: o.slug, label: o.title })) : [{ value: t.slug, label: `${t.slug} (missing)` }, ...options.map((o) => ({ value: o.slug, label: o.title }))]} />
        <SelectField label="Style" value={t.variant} onChange={(variant) => set({ ...t, variant })} options={[{ value: "default", label: "Cover image" }, { value: "logo", label: "Logo on dark" }] as const} />
        <TextInput label="Title override" value={t.title ?? ""} onChange={(x) => set({ ...t, title: x || null })} hint="Blank = case study title." />
        <TextInput label="Label override" value={t.label ?? ""} onChange={(x) => set({ ...t, label: x || null })} hint="Blank = case study card label." />
      </>)} />,
  );
}

function Testimonials({ value: v, onChange }: Ed<TestimonialsContent>) {
  return grid(
    <ListEditor label="Testimonials" items={v.items} onChange={(items) => onChange({ items })} addLabel="Add testimonial" title={(t) => t.name}
      create={() => ({ quote: "", initial: "", name: "", role: "" })}
      render={(t, set) => grid(<>
        <TextInput label="Name" value={t.name} onChange={(name) => set({ ...t, name, initial: t.initial || name.slice(0, 1).toUpperCase() })} />
        <TextInput label="Role" value={t.role} onChange={(role) => set({ ...t, role })} />
        <TextInput label="Avatar letter" value={t.initial} onChange={(initial) => set({ ...t, initial: initial.slice(0, 2) })} />
        <TextArea label="Quote" rows={4} value={t.quote} onChange={(quote) => set({ ...t, quote })} />
      </>)} />,
  );
}

const newBrain = (variant: BrainCard["variant"]): BrainCard =>
  variant === "list" ? { variant, kicker: "", title: "", items: [] } : variant === "archetypes" ? { variant, kicker: "", title: "", text: "", chips: [] } : { variant, kicker: "", title: "", text: "" };

function Brain({ value: v, onChange }: Ed<BrainContent>) {
  return grid(
    <ListEditor label="Cards" items={v.cards} onChange={(cards) => onChange({ cards })} addLabel="Add card" title={(c) => `${c.variant}: ${c.title}`} create={() => newBrain("text")}
      render={(c, set) => grid(<>
        <SelectField label="Layout" value={c.variant} onChange={(variant) => set({ ...newBrain(variant), kicker: c.kicker, title: c.title })} options={["text", "list", "archetypes"] as const} />
        <TextInput label="Kicker" value={c.kicker} onChange={(kicker) => set({ ...c, kicker })} hint="The “◆ ” is added automatically." />
        <TextInput label="Title" value={c.title} onChange={(title) => set({ ...c, title })} />
        {c.variant === "list" && <StringList label="Items" multiline items={c.items} onChange={(items) => set({ ...c, items })} />}
        {c.variant !== "list" && <TextArea label="Text" rows={4} value={c.text} onChange={(text) => set({ ...c, text })} />}
        {c.variant === "archetypes" && (
          <ListEditor label="Chips" items={c.chips} onChange={(chips) => set({ ...c, chips })} create={() => ({ label: "", on: false })} title={(x) => x.label}
            render={(x, setX) => grid(<>
              <TextInput label="Label" value={x.label} onChange={(label) => setX({ ...x, label })} />
              <Check label="Highlighted" checked={x.on} onChange={(on) => setX({ ...x, on })} />
            </>)} />
        )}
      </>)} />,
  );
}

function Writing({ value: v, onChange, options }: Ed<WritingContent> & { options: SlugOption[] }) {
  return grid(
    <ListEditor label="Articles shown" items={v.slugs} onChange={(slugs) => onChange({ slugs })} addLabel="Add article" title={(s) => options.find((o) => o.slug === s)?.title ?? s}
      create={() => options.find((o) => !v.slugs.includes(o.slug))?.slug ?? options[0]?.slug ?? ""}
      render={(s, set) => (
        <SelectField label="Article" value={s} onChange={set}
          options={options.some((o) => o.slug === s) ? options.map((o) => ({ value: o.slug, label: o.title })) : [{ value: s, label: `${s} (missing)` }, ...options.map((o) => ({ value: o.slug, label: o.title }))]} />
      )} />,
  );
}

/** Edits a whole section: common fields + the content editor for its key. */
export function SectionForm({ initial, caseStudies, articles }: { initial: Section; caseStudies: SlugOption[]; articles: SlugOption[] }) {
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState<Section>(initial);
  const { run, pending } = useAction(saveSection, { onOk: () => setSaved(s) });

  let body: React.ReactNode;
  switch (s.key) {
    case "about": body = <About value={s.content} onChange={(content) => setS({ ...s, content })} />; break;
    case "journey": body = <Journey value={s.content} onChange={(content) => setS({ ...s, content })} />; break;
    case "expertise": body = <Expertise value={s.content} onChange={(content) => setS({ ...s, content })} />; break;
    case "work": body = <Work value={s.content} onChange={(content) => setS({ ...s, content })} />; break;
    case "playbook": body = <Playbook value={s.content} onChange={(content) => setS({ ...s, content })} />; break;
    case "metrics": body = <Metrics value={s.content} onChange={(content) => setS({ ...s, content })} />; break;
    case "gallery": body = <Gallery value={s.content} options={caseStudies} onChange={(content) => setS({ ...s, content })} />; break;
    case "testimonials": body = <Testimonials value={s.content} onChange={(content) => setS({ ...s, content })} />; break;
    case "brain": body = <Brain value={s.content} onChange={(content) => setS({ ...s, content })} />; break;
    case "writing": body = <Writing value={s.content} options={articles} onChange={(content) => setS({ ...s, content })} />; break;
    case "contact": body = <p className="adm-muted">The contact links and availability line are edited under Profile &amp; settings.</p>; break;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); run(s); }}>
      <Fieldset legend="Heading">
        <TextInput label="Eyebrow" value={s.eyebrow} onChange={(eyebrow) => setS({ ...s, eyebrow })} hint="Small label above the heading." />
        <Check label="Visible on the home page" checked={s.visible} onChange={(visible) => setS({ ...s, visible })} />
        <TextArea label={s.key === "about" ? "Pull quote" : "Heading"} rows={2} value={s.heading} onChange={(heading) => setS({ ...s, heading })} hint="Enter = line break, *…* = italic." />
        <TextArea label="Intro paragraph" rows={3} value={s.intro} onChange={(intro) => setS({ ...s, intro })} />
      </Fieldset>
      <Fieldset legend="Content" grid={false}>{body}</Fieldset>
      <SaveBar pending={pending} dirty={!same(s, saved)} />
    </form>
  );
}
