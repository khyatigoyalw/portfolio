"use client";

import { useActionState } from "react";
import { submitContact, type ContactResult } from "@/app/(site)/_actions/contact";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactResult | null, FormData>(submitContact, null);
  return (
    <form className="c-form reveal d2" action={action}>
      <div className="c-row">
        <label>
          Name
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={200} autoComplete="email" />
        </label>
      </div>
      <label>
        Phone <span className="c-opt">(optional)</span>
        <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
      </label>
      <label>
        Message
        <textarea name="message" required rows={5} maxLength={5000} />
      </label>
      {/* honeypot: hidden from people and assistive tech, bots fill it */}
      <input className="c-hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button className="c-submit" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>
      <div role="status">{state?.ok && <p className="c-ok">Thanks — your message has been sent.</p>}</div>
      {state && !state.ok && (
        <p className="c-err" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
