import { AdminSectionPage } from "@/components/admin-section-page";

export const instant = false;

export default function KycPage() {
  return <AdminSectionPage eyebrow="KYC" title="KYC" description="수동 본인확인 검토와 상태 변경 흐름을 운영하는 관리자 화면입니다." nextPhase="KYC 도메인 Phase" />;
}
