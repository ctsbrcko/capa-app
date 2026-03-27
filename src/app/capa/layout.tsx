import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithRoles } from "@/services/auth-service";
import { getMyUnreadNotificationsCount } from "@/services/notification-service";
import { NotificationsRealtime } from "@/components/notifications/notifications-realtime";

export default async function CapaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { user: appUser, roles } = await getCurrentUserWithRoles();
  const unreadNotifications = await getMyUnreadNotificationsCount();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <aside className="hidden w-64 border-r border-slate-800 bg-slate-950/80 px-4 py-6 md:block">
        <div className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
          CAPA
        </div>
        <nav className="space-y-1 text-sm">
          <Link
            href="/capa"
            className="block rounded-md px-3 py-2 font-medium text-slate-100 hover:bg-slate-800"
          >
            Dashboard
          </Link>
          <NotificationsRealtime
            userId={user.id}
            initialUnreadCount={unreadNotifications}
          />
        </nav>
        <div className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <div>User: {user.email}</div>
          {appUser?.organization_id && (
            <div className="mt-1">Organization: {appUser.organization_id}</div>
          )}
          {roles.length > 0 && (
            <div className="mt-1">
              Roles: {roles.map((r) => r.code).join(", ")}
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}

