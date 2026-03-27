import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  event_type: string;
  event_key: string | null;
  is_read: boolean;
  created_at: string;
};

export async function listMyNotifications(limit = 50): Promise<NotificationItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("core.notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load notifications", error.message);
    return [];
  }

  return (data ?? []) as NotificationItem[];
}

export async function getMyUnreadNotificationsCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("core.notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to count unread notifications", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("core.notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("core.notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
}

