"use client";

import { deleteMessage, setMessageStatus } from "@/app/admin/_actions/messages";
import type { ContactMessageStatus } from "@/lib/admin/queries";
import { ConfirmButton } from "./save-bar";
import { useAction } from "./toast";

export function MessageActions({ id, status, name }: { id: string; status: ContactMessageStatus; name: string }) {
  const set = useAction(setMessageStatus);
  const del = useAction(deleteMessage);
  const busy = set.pending || del.pending;
  return (
    <div className="adm-actions">
      {status === "new" ? (
        <button type="button" className="adm-btn sm" disabled={busy} onClick={() => set.run(id, "read")}>Mark read</button>
      ) : (
        <button type="button" className="adm-btn sm" disabled={busy} onClick={() => set.run(id, "new")}>Mark new</button>
      )}
      {status !== "archived" && (
        <button type="button" className="adm-btn sm" disabled={busy} onClick={() => set.run(id, "archived")}>Archive</button>
      )}
      <ConfirmButton className="adm-btn sm danger" label="Delete" title="Delete this message?" disabled={busy}
        body={<>The message from {name} will be removed permanently.</>} onConfirm={() => del.run(id)} />
    </div>
  );
}
