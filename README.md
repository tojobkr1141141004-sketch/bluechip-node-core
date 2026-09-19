# APEX-MATRIX

APEX-MATRIX는 사용자 앱과 운영자 앱을 분리하고, Supabase를 데이터 중심으로 사용하는 단계형 플랫폼입니다.

## 현재 진행 상태

- PHASE 1 ✅ 모노레포 및 앱 경계
- PHASE 2 ✅ Supabase 기반
- PHASE 3 ✅ Auth / Admin RBAC / RLS
- PHASE 4 ✅ USER / ADMIN 애플리케이션 셸
- PHASE 5 ✅ 회원 데이터 도메인 및 회원관리
- PHASE 6 ✅ Ledger 원장 및 잔액
- PHASE 7 ✅ 수동 입출금 금융 운영
- PHASE 8 ✅ 채굴 상품 / 버전 / 계산 설정
- PHASE 9 ✅ 자동 채굴 계산 / 보상 지급
- PHASE 10 ✅ 채굴 정산 대사 / 운영 모니터링
- PHASE 11 ✅ 채굴 계약 생명주기 / 안전한 취소 / 최종 정산
- PHASE 12 ✅ 채굴 계산 안정화 / 복구 / 정정
- PHASE 13 ✅ 채굴 보상 발행 / 재원 통제
- PHASE 14 ✅ 금융 요청 이력 / 회원 투명성
- PHASE 15 ✅ ADMIN 운영센터
- PHASE 16 ✅ 운영 알림 / 장애 감시 기반
- PHASE 17 ✅ 관리자 세션 보안
- PHASE 18 ✅ RBAC / RLS / 실행권한 / 동시성 강화
- PHASE 19 ✅ Vercel / 모노레포 배포 안정화
- PHASE 20 ✅ USER / ADMIN UI·UX 및 운영센터 완성
- PHASE 21 ✅ USER 채굴 시작
- PHASE 22 ✅ USER 알림센터
- PHASE 23 ✅ USER 공개 함수 wrapper 보안 강화
- PHASE 24 ✅ 출시 전 통합 감사 / 운영 상태 검증

## PHASE 5 범위

USER에서는 본인 프로필과 사용자 설정을 수정할 수 있습니다.

ADMIN에서는 권한이 있는 운영자만 회원 검색과 상태 관리를 수행합니다. 인증 식별 정보는 auth.users를 직접 API에 노출하지 않고 member_directory로 동기화하며, admin_member_directory는 security-invoker view로 구성합니다.

회원 상태 변경은 profiles 상태값을 변경하는 작업이며 변경 내역은 audit_logs에 기록됩니다. 금융 잔액이나 채굴 보상 변경은 이 Phase에 포함하지 않습니다.

## PHASE 23 보안 원칙

Data API에 노출되는 USER용 public wrapper는 SECURITY INVOKER로 실행합니다. 권한 상승이 실제로 필요한 구현은 private schema의 SECURITY DEFINER 함수로 격리합니다. private 구현 함수에는 USER wrapper가 내부적으로 호출할 수 있을 정도의 authenticated EXECUTE만 부여하고 public/anon EXECUTE는 차단하며, 실제 호출 주체는 private 함수 내부에서 auth.uid()로 다시 검증합니다.

## PHASE 23 최종 검증

- public USER wrapper 3개는 SECURITY INVOKER
- privileged private implementation은 SECURITY DEFINER + auth.uid() 재검증
- private implementation의 EXECUTE는 authenticated에만 필요한 범위로 부여하고 public/anon은 차단
- Supabase Security Advisor 잔여 WARN은 Auth의 leaked password protection 항목 1건이며, 현재 운영 정책은 유료 플랜 기능에 의존하지 않고 Free 플랜 범위에서 운영하는 것입니다.
- PHASE 23 작업 당시 USER / ADMIN Vercel Preview는 모두 Ready로 확인되었으며, 최신 main 병합 커밋의 Vercel 상태는 별도 배포 파이프라인에서 확인합니다.
- 테스트 데이터 및 금융·채굴 운영 데이터는 검증 과정에서 영구 저장하지 않습니다.

## Free 플랜 운영 원칙

APEX-MATRIX의 기본 운영 환경은 Supabase Free 플랜을 유지합니다. 유료 전용 기능을 필수 전제로 삼지 않으며, 현재 제공 범위 밖의 Advisor 권고 항목은 별도 장애로 취급하지 않습니다.

## PHASE 24 범위

PHASE 24는 기능을 추가하는 단계가 아니라, 지금까지 구현된 USER / ADMIN / Auth / RBAC / RLS / Ledger / 수동 입출금 / 채굴 / 보상 / 알림 / Cron을 실제 운영 전제에서 통합 점검하는 단계입니다.

읽기 전용 감사 스크립트 `supabase/verification/phase24_prelaunch_audit.sql`를 기준으로 공개 테이블 RLS, public SECURITY DEFINER 실행권한, Ledger 잔액 정합성, 운영 데이터 청결성, 채굴 계산 OFF 상태, 보상 발행 OFF 상태, Cron 최근 실패, 미해결 채굴 오류, 미처리 운영 알림을 확인합니다.

출시 전 실제 금융·채굴 운영을 활성화할 때는 상품/버전 공개, 재원 정책, 계산 활성화, 금융 운영 정책을 별도의 운영 절차에 따라 순차적으로 켭니다. Vercel main 배포 상태는 현재 별도 배포 게이트에서 관리하며, 배포 상태 확인이 끝나기 전에는 출시 완료로 판정하지 않습니다.

## 앱 포트

- User App: http://localhost:3000
- Admin App: http://localhost:3001

## 개발 원칙

각 PHASE는 구현 → 테스트 → 검증 → 오류 수정 → 완료 판정 순으로 종료합니다. 앞 단계에 오류가 있으면 다음 PHASE로 진행하지 않습니다.

금융 자산이나 채굴 보상에 대한 직접적인 잔액 수정은 금지합니다. 모든 금전 상태 변경은 Ledger 기반 작업으로만 처리하며, 채굴 계산과 지급도 계약·계산이력·보상지급·Ledger 거래가 서로 추적 가능해야 합니다. 채굴 계약의 중도 취소도 취소 시각까지 최종 계산·정산한 뒤 terminal 상태로 전환하고, 취소 사유와 담당 운영자를 별도 기록합니다.
