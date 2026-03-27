import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser, Role } from "@/domain/core";

export async function getCurrentUserWithRoles(): Promise<{
  user: AppUser | null;
  roles: Role[];
}> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, roles: [] };

  const { data: userRow, error: userError } = await supabase
    .from("core.users")
    .select("organization_id,full_name,email")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) {
    console.error("Failed to load user organization", userError.message);
  }

  const { data: roleRows, error } = await supabase
    .from("core.user_roles")
    .select(
      `
      core_roles:core.roles (
        id,
        code,
        name
      )
    `,
    )
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load user roles", error.message);
    return {
      user: {
        id: user.id,
        email: (userRow as { email?: string | null } | null)?.email ?? user.email ?? null,
        full_name:
          (userRow as { full_name?: string | null } | null)?.full_name ??
          user.user_metadata.full_name ??
          null,
        organization_id:
          (userRow as { organization_id?: string | null } | null)
            ?.organization_id ?? null,
      },
      roles: [],
    };
  }

  const roles: Role[] =
    roleRows
      ?.map((row) =>
        (row as unknown as { core_roles: Role | null }).core_roles,
      )
      .filter((r): r is Role => Boolean(r))
      .map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
      })) ?? [];

  return {
    user: {
      id: user.id,
      email: (userRow as { email?: string | null } | null)?.email ?? user.email ?? null,
      full_name:
        (userRow as { full_name?: string | null } | null)?.full_name ??
        user.user_metadata.full_name ??
        null,
      organization_id:
        (userRow as { organization_id?: string | null } | null)
          ?.organization_id ?? null,
    },
    roles,
  };
}

