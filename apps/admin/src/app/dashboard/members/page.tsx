import { AdminSectionPage } from "@/components/admin-section-page";

export const instant = false;

export default function MembersPage() {
  return <AdminSectionPage eyebrow="MEMBERS" title="회원 관리" description="회원 검색·상태 관리·기본 계정 정보를 운영하는 관리자 화면입니다." nextPhase="회원 도메인 Phase" />;
}
