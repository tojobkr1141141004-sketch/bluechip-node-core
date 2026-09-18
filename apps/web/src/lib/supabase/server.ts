import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@apex-matrix/database";

export async function createWebServerSupabaseClient() {
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
        // Server Components cannot always mutate response cookies.
        // The app proxy refreshes sessions for requests.
      }
    }
  });
}
