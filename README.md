# APEX-MATRIX

APEX-MATRIX는 사용자 앱과 운영자 앱을 분리하고, Supabase를 데이터 중심으로 사용하는 단계형 플랫폼입니다.

## 현재 진행 상태

- PHASE 1 ✅ 모노레포 및 앱 경계
- PHASE 2 ✅ Supabase 기반
- PHASE 3 ✅ Auth / Admin RBAC / RLS
- PHASE 4 ✅ USER / ADMIN 애플리케이션 셸
- PHASE 5 🔄 회원 데이터 도메인 및 회원관리

## PHASE 5 범위

USER에서는 본인 프로필과 사용자 설정을 수정할 수 있습니다.

ADMIN에서는 권한이 있는 운영자만 회원 검색과 상태 관리를 수행합니다. 인증 식별 정보는 `auth.users`를 직접 노출하지 않고 `member_directory`로 동기화하며, `admin_member_directory`는 RLS를 존중하는 security-invoker view입니다.

회원 상태 변경은 `profiles`의 상태값을 바꾸는 작업이며, 변경 내역은 `audit_logs`에 자동 기록됩니다. 금융 잔액이나 채굴 보상 변경은 이 Phase에 포함하지 않습니다.

## 로컬 명령

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:admin
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

## 앱 포트

- User App: http://localhost:3000
- Admin App: http://localhost:3001

E2E는 빌드된 Production 서버를 대상으로 합니다.

## 개발 원칙

각 PHASE는 구현 → 테스트 → 검증 → 오류 수정 → 완료 판정 순으로 종료합니다. 앞 단계에 오류가 있으면 다음 PHASE로 진행하지 않습니다.

금융 자산이나 채굴 보상에 대한 직접적인 잔액 수정은 금지하며, 이후 금융·원장 Phase에서 원장 기반으로만 연결합니다.

## PHASE 5 검증 원칙

회원 조회는 권한이 있는 Admin만 가능하며, 회원 상태 변경은 DB 권한 정책과 감사 기록을 함께 사용합니다.
