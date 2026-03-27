import { revalidatePath } from "next/cache";
import {
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notification-service";

async function markOneRead(formData: FormData) {
  "use server";

  const id = String(formData.get("notification_id") ?? "");
  if (!id) return;
  await markNotificationAsRead(id);
  revalidatePath("/capa/notifications");
}

async function markAllRead() {
  "use server";
  await markAllNotificationsAsRead();
  revalidatePath("/capa/notifications");
}

export default async function NotificationsPage() {
  const notifications = await listMyNotifications(100);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">
            Assignment, overdue and status-change alerts.
          </p>
        </div>
        <form action={markAllRead}>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 bg-transparent px-4 text-sm font-medium text-slate-100 transition hover:bg-slate-900/40"
          >
            Mark all read
          </button>
        </form>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-400">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border p-3 ${
                  n.is_read
                    ? "border-slate-800 bg-slate-950/40"
                    : "border-sky-900/60 bg-slate-950/70"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{n.title}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(n.created_at).toLocaleString()} · {n.event_type}
                    </div>
                  </div>
                  {!n.is_read && (
                    <form action={markOneRead}>
                      <input type="hidden" name="notification_id" value={n.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-50 transition hover:bg-slate-700"
                      >
                        Mark read
                      </button>
                    </form>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-200">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

