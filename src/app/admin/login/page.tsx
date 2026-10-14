import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { NotConfigured } from "@/components/admin/gate";
import { getAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const a = await getAdmin();
  if (a.status === "unconfigured")
    return (
      <div className="adm-login">
        <NotConfigured />
      </div>
    );
  if (a.status === "ok") redirect("/admin");
  const { error } = await searchParams;
  return (
    <div className="adm-login">
      <div className="adm-card">
        <h1>Sign in</h1>
        <p>Enter your admin email and password.</p>
        {a.status === "forbidden" && (
          <p className="adm-error" role="alert">
            {a.email} is not an admin.
          </p>
        )}
        <LoginForm initialError={error} />
      </div>
    </div>
  );
}
