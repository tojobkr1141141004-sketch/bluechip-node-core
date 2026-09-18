import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

export type SupabaseServerCookies = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options: CookieOptions }[],
    headers?: Record<string, string>
  ) => void;
};

export function createServerSupabaseClient(cookies: SupabaseServerCookies) {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createServerClient(url, publishableKey, { cookies });
}
