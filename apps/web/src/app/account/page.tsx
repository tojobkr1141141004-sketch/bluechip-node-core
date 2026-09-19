import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { localizeHref } from "@apex-matrix/i18n";
import { getRequestLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Account"
};

// This is a private, session-dependent route. Block pre-rendering/instant navigation
// so authentication cookies are evaluated at request time.
export const instant = false;

export default async function AccountPage() {
  const locale = await getRequestLocale();
  redirect(localizeHref("/dashboard/profile", locale) as never);
}
