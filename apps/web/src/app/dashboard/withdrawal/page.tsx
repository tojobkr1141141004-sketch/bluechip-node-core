import { UserSectionPage } from "@/components/app/section-page";

export const instant = false;

export default function WithdrawalPage() {
  return (
    <UserSectionPage
      eyebrow="WITHDRAWAL"
      title="출금"
      description="출금 요청, 심사 상태, 처리 결과를 조회하는 사용자 화면입니다."
      nextPhase="금융 운영 Phase"
    />
  );
}
