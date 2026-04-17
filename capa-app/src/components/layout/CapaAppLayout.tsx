import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/logout/action";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentActor } from "@/services/capa-service";
import { getCurrentUserWithRoles } from "@/services/auth-service";

export default async function CapaAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { roles } = await getCurrentUserWithRoles();
  const actor = await getCurrentActor();

  const { data: notifications } = await supabase
    .schema("capa")
    .from("notifications")
    .select("id")
    .eq("is_read", false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <aside className="hidden w-64 border-r border-slate-800 bg-slate-950/80 px-4 py-6 md:block">
        <div className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
          CAPA
        </div>
        <nav className="space-y-1 text-sm">
          <Link
            href="/dashboard"
            className="block rounded-md px-3 py-2 font-medium text-slate-100 hover:bg-slate-800"
          >
            Dashboard
          </Link>
          <Link
            href="/capa"
            className="block rounded-md px-3 py-2 font-medium text-slate-100 hover:bg-slate-800"
          >
            Records
          </Link>
          <Link
            href="/notifications"
            className="block rounded-md px-3 py-2 font-medium text-slate-100 hover:bg-slate-800"
          >
            Notifications ({notifications?.length || 0})
          </Link>
        </nav>
        <div className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <div>User: {user.email}</div>
          <p className="mt-1 text-xs text-slate-400">
            Organization: {actor?.organizationId || "N/A"}
          </p>
          {roles.length > 0 && (
            <div className="mt-1">
              Roles: {roles.map((r) => r.code).join(", ")}
            </div>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="mt-4 w-full rounded bg-red-500 p-2 text-white"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
