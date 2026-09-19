import { createServerSupabaseClient } from "@apex-matrix/database";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  normalizeLocale,
  type AppLocale
} from "@apex-matrix/i18n";
import { NextResponse, type NextRequest } from "next/server";

function pathLocale(pathname: string): AppLocale | null {
  const candidate = pathname.split("/")[1];
  return SUPPORTED_LOCALES.includes(candidate as AppLocale)
    ? (candidate as AppLocale)
    : null;
}

function browserLocale(request: NextRequest) {
  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  if (stored) return normalizeLocale(stored);

  const accepted = request.headers.get("accept-language") ?? "";
  for (const item of accepted.split(",")) {
    const candidate = item.trim().split(";")[0];
    const normalized = candidate?.toLowerCase().split("-")[0];
    if (SUPPORTED_LOCALES.includes(normalized as AppLocale)) {
      return normalized as AppLocale;
    }
  }

  return DEFAULT_LOCALE;
}

function isLocalizedRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/account" ||
    pathname.startsWith("/dashboard")
  );
}

function createForwardResponse(request: NextRequest, locale: AppLocale) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-apex-locale", locale);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Language", locale);
  return response;
}

function persistLocale(
  response: NextResponse,
  locale: AppLocale,
  request: NextRequest
) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
}

export async function proxy(request: NextRequest) {
  const locale = pathLocale(request.nextUrl.pathname) ?? browserLocale(request);
  const hasLocalePrefix = pathLocale(request.nextUrl.pathname) !== null;
  const internalPath = hasLocalePrefix
    ? request.nextUrl.pathname.replace(/^\/(ko|ja|en)(?=\/|$)/, "") || "/"
    : request.nextUrl.pathname;

  if (!hasLocalePrefix && isLocalizedRoute(internalPath)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      internalPath === "/" ? `/${locale}/dashboard` : `/${locale}${internalPath}`;
    return NextResponse.redirect(redirectUrl);
  }

  let response = createForwardResponse(request, locale);
  persistLocale(response, locale, request);

  const hasSupabaseConfig =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!hasSupabaseConfig) return response;

  const supabase = createServerSupabaseClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet, headers) {
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value);
      });

      response = createForwardResponse(request, locale);
      persistLocale(response, locale, request);

      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });

      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
    }
  });

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
