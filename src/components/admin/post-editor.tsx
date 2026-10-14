"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deletePost, savePost } from "@/app/admin/_actions/posts";
import { slugify } from "@/lib/admin/slugify";
import type { Block, Post } from "@/lib/schema";
import type { PostDraft } from "./post-draft";
import { BlockEditor } from "./block-editor";
import { Fieldset, ListEditor, NumberInput, SelectField, StringList, TextArea, TextInput } from "./fields";
import { MediaField } from "./media-picker";
import { ConfirmButton, SaveBar, same } from "./save-bar";
import { useAction } from "./toast";

/** Drop empty list rows / blank optional strings before they reach the schema. */
function clean(d: PostDraft): PostDraft {
  const body = d.body.flatMap((b): Block[] => {
    if (b.type === "list") return [{ ...b, items: b.items.map((x) => x.trim()).filter(Boolean) }];
    if (b.type === "image") return [{ ...b, caption: b.caption || undefined }];
    if (b.type === "quote") return [{ ...b, cite: b.cite || undefined }];
    return [b];
  });
  return { ...d, slug: slugify(d.slug) || d.slug, body, skills: d.skills.map((s) => s.trim()).filter(Boolean) };
}

const BASE = { case_study: "/admin/case-studies", article: "/admin/articles" } as const;

export function PostEditor({ initial }: { initial: PostDraft }) {
  const router = useRouter();
  const noun = initial.type === "case_study" ? "case study" : "article";
  const [saved, setSaved] = useState(initial);
  const [d, setD] = useState(initial);
  // new posts derive the slug from the title until the user edits the slug by hand
  const [slugTouched, setSlugTouched] = useState(initial.id !== null);
  const set = (patch: Partial<PostDraft>) => setD((x) => ({ ...x, ...patch }));

  const sent = useRef<PostDraft | null>(null); // exactly what was submitted (status override included)
  const save = useAction(savePost, {
    onOk: (r) => {
      const next = { ...(sent.current ?? clean(d)), id: r.id, slug: r.slug };
      setD(next);
      setSaved(next);
      if (initial.id === null) router.replace(`${BASE[d.type]}/${r.id}`);
      else router.refresh();
    },
  });
  const del = useAction(deletePost, { onOk: () => router.push(BASE[d.type]) });

  const submit = (status?: Post["status"]) => {
    const payload = { ...clean(d), status: status ?? d.status };
    sent.current = payload;
    save.run(payload);
  };
  const dirty = !same(clean(d), clean(saved));
  const isCase = d.type === "case_study";

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Fieldset legend="Basics">
        <TextInput label="Title" wide required value={d.title} onChange={(title) => set({ title, ...(slugTouched ? {} : { slug: slugify(title) }) })} />
        <TextInput label="URL slug" mono required value={d.slug} onChange={(v) => { setSlugTouched(true); set({ slug: v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-/, "") }); }}
          hint={`/${isCase ? "case-studies" : "articles"}/${d.slug || "…"}. Must be unique; changing it breaks old links.`} />
        <SelectField label="Status" value={d.status} onChange={(status) => set({ status })} options={[{ value: "draft", label: "Draft (hidden)" }, { value: "published", label: "Published (live)" }] as const} />
        <TextInput label="Subtitle" wide value={d.subtitle} onChange={(subtitle) => set({ subtitle })} />
        <TextInput label="Category tag" value={d.tag} onChange={(tag) => set({ tag })} hint={isCase ? "e.g. Marketplace" : 'e.g. "D2C · Growth"; the page appends the read time.'} />
        {isCase ? (
          <>
            <TextInput label="Gallery card label" value={d.cardLabel ?? ""} onChange={(v) => set({ cardLabel: v || null })} />
            <TextInput label="Card aspect ratio" mono value={d.cardAspect ?? ""} onChange={(v) => set({ cardAspect: v || null })} hint='width/height, e.g. "1080/2400"' />
          </>
        ) : (
          <>
            <NumberInput label="Read time (minutes)" min={1} value={d.readTimeMinutes} onChange={(v) => set({ readTimeMinutes: v === null ? null : Math.max(1, Math.round(v)) })} />
            <TextArea label="Card excerpt" rows={3} value={d.excerpt ?? ""} onChange={(v) => set({ excerpt: v || null })} hint="Short blurb on the home page card." />
          </>
        )}
        <MediaField label="Cover image" value={d.coverMediaId} onChange={(coverMediaId) => set({ coverMediaId })} />
      </Fieldset>

      <Fieldset legend="Details under the hero" grid={false}>
        <ListEditor label="Meta rows" items={d.meta} onChange={(meta) => set({ meta })} create={() => ({ label: "", value: "" })} addLabel="Add row" title={(m) => m.label}
          render={(m, s) => (
            <div className="adm-grid">
              <TextInput label="Label" value={m.label} onChange={(label) => s({ ...m, label })} hint="Brand, Role, Objective…" />
              <TextInput label="Value" value={m.value} onChange={(value) => s({ ...m, value })} />
            </div>
          )} />
      </Fieldset>

      <Fieldset legend="Body" grid={false}>
        <BlockEditor blocks={d.body} onChange={(body) => set({ body })} />
      </Fieldset>

      <Fieldset legend="Wrap-up">
        <StringList label="Skills demonstrated" items={d.skills} onChange={(skills) => set({ skills })} addLabel="Add skill" />
        <TextArea label="Takeaway" rows={3} value={d.takeaway} onChange={(takeaway) => set({ takeaway })} hint="Closing callout. Blank hides it." />
      </Fieldset>

      <Fieldset legend="SEO">
        <TextInput label="SEO title" value={d.seoTitle ?? ""} onChange={(v) => set({ seoTitle: v || null })} hint="Blank = derived from the title." />
        <TextInput label="SEO description" value={d.seoDescription ?? ""} onChange={(v) => set({ seoDescription: v || null })} hint="Blank = derived from subtitle." />
      </Fieldset>

      <SaveBar pending={save.pending} dirty={dirty} label={d.status === "published" ? "Save" : "Save draft"}>
        {d.status === "draft" ? (
          <button type="button" className="adm-btn" disabled={save.pending} onClick={() => { set({ status: "published" }); submit("published"); }}>Publish</button>
        ) : (
          <button type="button" className="adm-btn" disabled={save.pending} onClick={() => { set({ status: "draft" }); submit("draft"); }}>Unpublish</button>
        )}
        {d.id ? (
          <a className="adm-btn" target="_blank" rel="noreferrer" aria-label="Preview (opens in a new tab; save first)" href={`/api/draft?type=${d.type}&slug=${encodeURIComponent(saved.slug)}`}>Preview ↗</a>
        ) : (
          <span className="adm-muted">Save once to enable preview</span>
        )}
        {d.id && (
          <ConfirmButton label="Delete" title={`Delete this ${noun}?`} body={<>“{saved.title}” will be removed permanently{isCase ? " and dropped from the home gallery" : " and dropped from the home page writing list"}.</>}
            onConfirm={() => del.run(d.id)} disabled={del.pending} />
        )}
      </SaveBar>
    </form>
  );
}
