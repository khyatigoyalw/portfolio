"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState(initialError ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    if (error) {
      setError(error.message);
      setState("idle");
    } else setState("sent");
  }

  if (state === "sent")
    return (
      <p role="status">
        Check <b>{email}</b> for a sign-in link. It works once; open it in this browser.
      </p>
    );

  return (
    <form onSubmit={submit}>
      <div className="adm-field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <p style={{ marginTop: 14 }}>
        <button className="adm-btn primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </p>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
