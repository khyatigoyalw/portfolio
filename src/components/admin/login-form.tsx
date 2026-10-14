"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/_actions/auth";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const error = state?.error ?? initialError;

  return (
    <form action={action}>
      <div className="adm-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="adm-field" style={{ marginTop: 12 }}>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <p style={{ marginTop: 14 }}>
        <button className="adm-btn primary" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
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
