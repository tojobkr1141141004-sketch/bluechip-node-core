import { AdminSectionPage } from "@/components/admin-section-page";

export const instant = false;

export default function SystemPage() {
  return <AdminSectionPage eyebrow="SYSTEM" title="시스템" description="운영자 권한, 감사 기록, 시스템 상태와 안전 설정을 관리하는 관리자 화면입니다." nextPhase="시스템 운영 Phase" />;
}
