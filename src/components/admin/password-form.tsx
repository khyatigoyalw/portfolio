"use client";

import { useState } from "react";
import { changePassword } from "@/app/admin/_actions/auth";
import { useAction } from "./toast";

export function PasswordForm() {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const { run, pending } = useAction(changePassword, { onOk: () => { setNext(""); setConfirm(""); } });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run({ newPassword: next, confirm }); }}>
      <div className="adm-grid">
        <div className="adm-field">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      </div>
      <p style={{ marginTop: 14 }}>
        <button className="adm-btn primary" type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </p>
    </form>
  );
}
