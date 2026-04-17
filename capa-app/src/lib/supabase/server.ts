import { cookies } from "next/headers";
import { createServerClient as createSupabaseSSRClient } from "@supabase/ssr";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseSSRClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // When called from a Server Component, Next.js forbids setting cookies.
            // Middleware should handle refreshes; ignore here.
          }
        },
      },
    },
  );
}
