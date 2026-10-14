import { signOut } from "../_actions/auth";
import { gate } from "@/components/admin/gate";
import { NavLinks } from "@/components/admin/nav-links";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const g = await gate();
  if (!g.ok) return <main className="adm-main">{g.view}</main>;
  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <div className="adm-brand">
          Site editor<small>Admin</small>
        </div>
        <NavLinks />
        <div className="adm-side-foot">
          <span>{g.email}</span>
          <form action={signOut}>
            <button className="adm-btn sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="adm-main" id="main">
        {children}
      </main>
    </div>
  );
}
