import { AdminSectionPage } from "@/components/admin-section-page";

export const instant = false;

export default function MiningPage() {
  return <AdminSectionPage eyebrow="MINING / SETTLEMENT" title="채굴·정산" description="자동 채굴 계산, 보상 지급, 정산 상태와 오류를 모니터링하는 관리자 화면입니다." nextPhase="채굴·정산 Phase" />;
}
