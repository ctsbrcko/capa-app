import { createServerClient } from "@/lib/supabase/server";
import type { AppUser, Role } from "@/domain/core";

export async function getCurrentUserWithRoles(): Promise<{
  user: AppUser | null;
  roles: Role[];
}> {
  const supabase = await createServerClient();

  const { data: authUser } = await supabase.auth.getUser();

  if (!authUser.user) return { user: null, roles: [] };

  const { data: user, error: userError } = await supabase
    .schema("core")
    .from("users")
    .select("id, email, first_name, last_name, organization_id")
    .eq("auth_user_id", authUser.user.id)
    .single();

  if (userError) {
    console.error("Failed to load user profile", userError.message);
  }

  if (!user) {
    throw new Error("User not found");
  }

  const { data: roleRows, error } = await supabase
    .schema("core")
    .from("user_roles")
    .select(`
      role_id,
      roles(id, code, name)
    `)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load user roles", error.message);
    return {
      user: {
        id: String(user.id),
        email: user.email ?? authUser.user.email ?? null,
        full_name:
          `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || null,
      },
      roles: [],
    };
  }

  const roles: Role[] =
    roleRows
      ?.map((row) => (row as unknown as { roles: Role | null }).roles)
      .filter((r): r is Role => Boolean(r))
      .map((r) => ({
        id: String(r.id),
        code: r.code,
        name: r.name,
      })) ?? [];

  return {
    user: {
      id: String(user.id),
      email: user.email ?? authUser.user.email ?? null,
      full_name:
        `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || null,
    },
    roles,
  };
}
