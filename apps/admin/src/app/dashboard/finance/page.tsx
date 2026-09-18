import { AdminSectionPage } from "@/components/admin-section-page";

export const instant = false;

export default function FinancePage() {
  return <AdminSectionPage eyebrow="FINANCE" title="금융 운영" description="원화·USDT 입금과 출금 요청을 수동으로 검토하고 원장에 반영하는 관리자 화면입니다." nextPhase="금융 원장 Phase" />;
}
