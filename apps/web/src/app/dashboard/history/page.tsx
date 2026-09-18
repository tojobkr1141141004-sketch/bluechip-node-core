import { UserSectionPage } from "@/components/app/section-page";

export const instant = false;

export default function HistoryPage() {
  return (
    <UserSectionPage
      eyebrow="HISTORY"
      title="활동 기록"
      description="채굴·정산·입금·출금과 같은 중요한 이벤트를 변경 불가능한 기록 중심으로 보여주는 화면입니다."
      nextPhase="원장·기록 Phase"
    />
  );
}
