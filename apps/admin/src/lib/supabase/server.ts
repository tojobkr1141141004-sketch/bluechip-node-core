import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@apex-matrix/database";

export async function createAdminServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerSupabaseClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // The app proxy refreshes response cookies.
      }
    }
  });
}
