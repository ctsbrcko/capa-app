"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
};

type ToastNotification = {
  id: string;
  title: string;
  message: string;
};

export function NotificationsRealtime({
  userId,
  initialUnreadCount,
}: {
  userId: string;
  initialUnreadCount: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let mounted = true;

    const refreshUnreadCount = async () => {
      const { count } = await supabase
        .schema("core")
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (mounted) setUnreadCount(count ?? 0);
    };

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "core",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          if (!row.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
          setToasts((prev) => [
            ...prev,
            { id: row.id, title: row.title, message: row.message },
          ]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== row.id));
          }, 6000);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "core",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refreshUnreadCount();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return (
    <>
      <Link
        href="/capa/notifications"
        className="flex items-center justify-between rounded-md px-3 py-2 font-medium text-slate-100 hover:bg-slate-800"
      >
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
            {unreadCount}
          </span>
        )}
      </Link>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[320px] max-w-[90vw] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-lg border border-sky-900/70 bg-slate-950/95 p-3 shadow-xl"
          >
            <div className="text-sm font-semibold text-slate-100">
              {toast.title}
            </div>
            <div className="mt-1 text-xs text-slate-300">{toast.message}</div>
          </div>
        ))}
      </div>
    </>
  );
}

