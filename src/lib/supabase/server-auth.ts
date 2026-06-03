import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseBrowserConfig } from "@/lib/supabase/config";

export async function createSupabaseServerAuthClient() {
  const config = getSupabaseBrowserConfig();

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always set cookies. Route handlers and
          // proxy refresh the session cookies when mutation is allowed.
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerAuthClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}
