"use client";

import Link from "next/link";
import { useState } from "react";
import { reorderSections, setSectionVisible } from "@/app/admin/_actions/sections";
import { Check, move } from "./fields";
import { useAction } from "./toast";

type Row = { key: string; heading: string; eyebrow: string; visible: boolean };

export function SectionsList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(initial.map((r) => r.key).join());
  const order = useAction(reorderSections, { onOk: () => setSaved(rows.map((r) => r.key).join()) });
  const vis = useAction(setSectionVisible);
  const dirty = rows.map((r) => r.key).join() !== saved;

  return (
    <>
      <table className="adm-table">
        <thead>
          <tr><th>Order</th><th>Section</th><th>Visible</th><th><span className="sr-only">Edit</span></th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key}>
              <td className="num">
                <button type="button" className="adm-btn sm icon ghost" disabled={i === 0} onClick={() => setRows(move(rows, i, -1))} aria-label={`Move ${r.key} up`}>↑</button>{" "}
                <button type="button" className="adm-btn sm icon ghost" disabled={i === rows.length - 1} onClick={() => setRows(move(rows, i, 1))} aria-label={`Move ${r.key} down`}>↓</button>
              </td>
              <td>
                <Link href={`/admin/sections/${r.key}`}><b>{r.key}</b></Link>
                <div className="adm-muted" style={{ fontSize: 13 }}>{r.heading.replace(/\n/g, " ").slice(0, 90) || r.eyebrow}</div>
              </td>
              <td>
                <Check label={r.visible ? "Shown" : "Hidden"} checked={r.visible}
                  onChange={(visible) => { setRows(rows.map((x) => (x.key === r.key ? { ...x, visible } : x))); vis.run(r.key, visible); }} />
              </td>
              <td><Link className="adm-btn sm" href={`/admin/sections/${r.key}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="adm-actions" style={{ marginTop: 16 }}>
        <button type="button" className="adm-btn primary" disabled={!dirty || order.pending} onClick={() => order.run(rows.map((r) => r.key))}>
          {order.pending ? "Saving…" : "Save order"}
        </button>
        {dirty && <span className="adm-dirty">Order changed, not saved</span>}
      </p>
    </>
  );
}
