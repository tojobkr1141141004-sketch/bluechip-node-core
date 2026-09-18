import { UserSectionPage } from "@/components/app/section-page";

export const instant = false;

export default function AssetsPage() {
  return (
    <UserSectionPage
      eyebrow="ASSETS"
      title="자산"
      description="KRW·USDT 및 지원 자산의 원장 기준 잔액과 내역을 확인하는 사용자 화면입니다."
      nextPhase="금융 원장 Phase"
    />
  );
}
