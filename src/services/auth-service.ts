import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser, Role } from "@/domain/core";

export async function getCurrentUserWithRoles(): Promise<{
  user: AppUser | null;
  roles: Role[];
}> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return { user: null, roles: [] };

  const { data: dbUser, error: dbUserError } = await supabase
    .schema("core")
    .from("users")
    .select("id, email, first_name, last_name, organization_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (dbUserError) {
    console.error("Failed to load user profile", dbUserError.message);
  }

  if (!dbUser) {
    return {
      user: {
        id: authUser.id,
        email: authUser.email ?? null,
        full_name:
          (typeof authUser.user_metadata?.full_name === "string"
            ? authUser.user_metadata.full_name
            : null) ?? null,
        organization_id: null,
      },
      roles: [],
    };
  }

  const { data: roleRows, error } = await supabase
    .schema("core")
    .from("user_roles")
    .select(`
      role_id,
      roles(id, code, name)
    `)
    .eq("user_id", dbUser.id);

  if (error) {
    console.error("Failed to load user roles", error.message);
    return {
      user: {
        id: String(dbUser.id),
        email: dbUser.email ?? authUser.email ?? null,
        full_name:
          `${dbUser.first_name ?? ""} ${dbUser.last_name ?? ""}`.trim() || null,
        organization_id: dbUser.organization_id ?? null,
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
      id: String(dbUser.id),
      email: dbUser.email ?? authUser.email ?? null,
      full_name:
        `${dbUser.first_name ?? ""} ${dbUser.last_name ?? ""}`.trim() || null,
      organization_id: dbUser.organization_id ?? null,
    },
    roles,
  };
}
