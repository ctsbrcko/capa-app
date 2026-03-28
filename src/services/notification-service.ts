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

async function getCurrentDbUserId(supabase: any): Promise<number | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: dbUser } = await supabase
    .schema("core")
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .single();

  return dbUser?.id ?? null;
}

export async function listMyNotifications(limit = 50): Promise<NotificationItem[]> {
  const supabase = await createSupabaseServerClient();

  const dbUserId = await getCurrentDbUserId(supabase);
  if (!dbUserId) return [];

  const { data, error } = await supabase
    .schema("core")
    .from("notifications")
    .select("*")
    .eq("user_id", dbUserId)
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

  const dbUserId = await getCurrentDbUserId(supabase);
  if (!dbUserId) return 0;

  const { count, error } = await supabase
    .schema("core")
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUserId)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to count unread notifications", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const dbUserId = await getCurrentDbUserId(supabase);
  if (!dbUserId) return;

  await supabase
    .schema("core")
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", dbUserId);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const dbUserId = await getCurrentDbUserId(supabase);
  if (!dbUserId) return;

  await supabase
    .schema("core")
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", dbUserId)
    .eq("is_read", false);
}