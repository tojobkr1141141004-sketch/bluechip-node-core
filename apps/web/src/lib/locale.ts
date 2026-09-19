import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  normalizeLocale,
  type AppLocale
} from "@apex-matrix/i18n";

export async function getRequestLocale(): Promise<AppLocale> {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-apex-locale");
  if (headerLocale) return normalizeLocale(headerLocale);

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  return cookieLocale ? normalizeLocale(cookieLocale) : DEFAULT_LOCALE;
}
