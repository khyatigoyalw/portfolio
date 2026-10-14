import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdmin } from "@/lib/admin/auth";
import { signOut } from "@/app/admin/_actions/auth";

const README = "https://github.com/khyatigoyalw/portfolio#supabase-setup";

export function NotConfigured() {
  return (
    <div className="adm-notice" role="note">
      <h2>Connect Supabase to edit</h2>
      <p>
        The site is running from <code>content/seed.json</code> (local mode), so there is nothing to edit here. Set{" "}
        <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, run the migration, add your email to{" "}
        <code>admins</code> and push the seed content.
      </p>
      <p>
        Step by step: <a href={README}>README, “Supabase setup”</a>.
      </p>
    </div>
  );
}

export function NotAuthorised({ email }: { email: string }) {
  return (
    <div className="adm-notice" role="alert">
      <h2>Not authorised</h2>
      <p>
        You are signed in as <b>{email}</b>, but that email is not in the <code>admins</code> table, so you cannot edit this site.
      </p>
      <form action={signOut}>
        <button className="adm-btn" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}

export type Gate = { ok: true; db: SupabaseClient; email: string } | { ok: false; view: ReactNode };

/**
 * First line of every admin page: server-side proof the visitor is a signed-in admin.
 *   const g = await gate(); if (!g.ok) return g.view;
 */
export async function gate(): Promise<Gate> {
  const a = await getAdmin();
  if (a.status === "unconfigured") return { ok: false, view: <NotConfigured /> };
  if (a.status === "anon") redirect("/admin/login");
  if (a.status === "forbidden") return { ok: false, view: <NotAuthorised email={a.email} /> };
  return { ok: true, db: a.supabase, email: a.email };
}
