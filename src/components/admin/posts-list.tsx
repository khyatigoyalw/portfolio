"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deletePost, reorderPosts, setPostStatus } from "@/app/admin/_actions/posts";
import type { PostType } from "@/lib/schema";
import { move } from "./fields";
import { ConfirmButton } from "./save-bar";
import { useAction } from "./toast";

export type PostRow = { id: string; slug: string; title: string; status: "draft" | "published"; tag: string; updatedAt: string | null };
const BASE = { case_study: "/admin/case-studies", article: "/admin/articles" } as const;

export function PostsList({ type, initial }: { type: PostType; initial: PostRow[] }) {
  const [rows, setRows] = useState(initial);
  const [savedOrder, setSavedOrder] = useState(initial.map((r) => r.id).join());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const reorder = useAction(reorderPosts, { onOk: () => setSavedOrder(rows.map((r) => r.id).join()) });
  const toggle = useAction(setPostStatus);
  const del = useAction(deletePost);

  const filtering = q.trim() !== "" || status !== "all";
  const shown = useMemo(
    () => rows.filter((r) => (status === "all" || r.status === status) && `${r.title} ${r.slug} ${r.tag}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q, status],
  );
  const dirty = rows.map((r) => r.id).join() !== savedOrder;
  const noun = type === "case_study" ? "case study" : "article";

  return (
    <>
      <div className="adm-toolbar">
        <input type="search" aria-label={`Search ${noun}s`} placeholder="Search title, slug, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>
      <table className="adm-table">
        <thead>
          <tr><th>Order</th><th>Title</th><th>Status</th><th className="hide-sm">Updated</th><th><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const i = rows.findIndex((x) => x.id === r.id);
            return (
              <tr key={r.id}>
                <td className="num">
                  <button type="button" className="adm-btn sm icon ghost" disabled={filtering || i === 0} onClick={() => setRows(move(rows, i, -1))} aria-label={`Move ${r.title} up`}>↑</button>{" "}
                  <button type="button" className="adm-btn sm icon ghost" disabled={filtering || i === rows.length - 1} onClick={() => setRows(move(rows, i, 1))} aria-label={`Move ${r.title} down`}>↓</button>
                </td>
                <td>
                  <Link href={`${BASE[type]}/${r.id}`}><b>{r.title}</b></Link>
                  <div className="adm-muted" style={{ fontSize: 13 }}>/{r.slug}{r.tag ? ` · ${r.tag}` : ""}</div>
                </td>
                <td><span className={`adm-pill${r.status === "published" ? " live" : ""}`}>{r.status}</span></td>
                <td className="hide-sm adm-muted num">{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : ""}</td>
                <td>
                  <div className="adm-actions">
                    <Link className="adm-btn sm" href={`${BASE[type]}/${r.id}`}>Edit</Link>
                    <button type="button" className="adm-btn sm" disabled={toggle.pending}
                      onClick={() => { const next = r.status === "published" ? "draft" : "published"; setRows(rows.map((x) => (x.id === r.id ? { ...x, status: next } : x))); toggle.run(r.id, next); }}>
                      {r.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <ConfirmButton className="adm-btn sm danger" label="Delete" title={`Delete this ${noun}?`} body={<>“{r.title}” will be removed permanently.</>}
                      onConfirm={() => { setRows(rows.filter((x) => x.id !== r.id)); del.run(r.id); }} />
                  </div>
                </td>
              </tr>
            );
          })}
          {!shown.length && <tr><td colSpan={5} className="adm-muted">Nothing here yet.</td></tr>}
        </tbody>
      </table>
      <p className="adm-actions" style={{ marginTop: 16 }}>
        <button type="button" className="adm-btn primary" disabled={!dirty || reorder.pending} onClick={() => reorder.run(type, rows.map((r) => r.id))}>
          {reorder.pending ? "Saving…" : "Save order"}
        </button>
        {dirty && <span className="adm-dirty">Order changed, not saved</span>}
        {filtering && <span className="adm-muted">Clear the search / filter to reorder.</span>}
      </p>
    </>
  );
}
