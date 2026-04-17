import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <Link
          href="/capa"
          className="text-sm font-medium text-sky-400 hover:text-sky-300"
        >
          Back to CAPA
        </Link>
      </div>
      <p className="text-sm text-slate-400">
        Unread and read notifications for your account appear here.
      </p>
    </div>
  );
}
