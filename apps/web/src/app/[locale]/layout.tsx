import { notFound } from "next/navigation";
import { SUPPORTED_LOCALES, type AppLocale } from "@apex-matrix/i18n";
import type { Metadata } from "next";

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const descriptions: Record<AppLocale, string> = {
    ko: "자산, 입출금 요청, 채굴 활동과 영구 원장 기록을 확인하는 APEX-MATRIX 사용자 센터입니다.",
    ja: "資産、入出金申請、マイニング状況、台帳記録を確認できるAPEX-MATRIXユーザーセンターです。",
    en: "APEX-MATRIX account center for assets, money requests, mining activity, and permanent ledger records."
  };
  const activeLocale = SUPPORTED_LOCALES.includes(locale as AppLocale) ? locale as AppLocale : "ko";

  return {
    description: descriptions[activeLocale],
    alternates: {
      canonical: `/${activeLocale}`,
      languages: { ko: "/ko", ja: "/ja", en: "/en" }
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!SUPPORTED_LOCALES.includes(locale as AppLocale)) {
    notFound();
  }

  return children;
}
