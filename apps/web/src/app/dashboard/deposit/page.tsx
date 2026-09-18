import { UserSectionPage } from "@/components/app/section-page";

export const instant = false;

export default function DepositPage() {
  return (
    <UserSectionPage
      eyebrow="DEPOSIT"
      title="입금"
      description="운영자가 확인·승인하는 원화 및 USDT 수동 입금 절차를 사용자 관점에서 안내하는 화면입니다."
      nextPhase="금융 운영 Phase"
    />
  );
}
