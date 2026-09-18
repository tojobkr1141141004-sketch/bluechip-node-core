import { UserSectionPage } from "@/components/app/section-page";

export const instant = false;

export default function ProfilePage() {
  return (
    <UserSectionPage
      eyebrow="PROFILE"
      title="내 정보"
      description="프로필과 사용자 설정을 안전하게 관리하는 화면입니다."
      nextPhase="사용자 정보 확장 Phase"
    />
  );
}
