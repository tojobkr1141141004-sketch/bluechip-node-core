import { UserSectionPage } from "@/components/app/section-page";

export const instant = false;

export default function MiningPage() {
  return (
    <UserSectionPage
      eyebrow="MINING"
      title="채굴 현황"
      description="채굴기 상태, 누적 채굴량, 일자별 수익 기록을 확인하는 사용자 화면입니다."
      nextPhase="PHASE 10 이후"
    />
  );
}
