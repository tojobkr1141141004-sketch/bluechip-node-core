# APEX-MATRIX

APEX-MATRIX는 사용자 앱과 운영자 앱을 분리하고, Supabase를 데이터 중심으로 사용하는 단계형 플랫폼입니다.

## PHASE 1 상태

현재 단계는 **모노레포 기반과 앱 경계 확정**입니다.

```
APEX-MATRIX/
├── apps/
│   ├── web/        # 사용자 앱
│   └── admin/      # 운영자 앱
├── packages/
│   ├── ui/
│   ├── database/
│   ├── types/
│   ├── validation/
│   ├── calculations/
│   └── config/
├── tests/
└── supabase/       # 다음 Phase부터 사용
```

## 로컬 명령

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:admin
pnpm lint
pnpm typecheck
pnpm build
pnpm build
pnpm test:e2e
```

## 앱 포트

- User App: http://localhost:3000
- Admin App: http://localhost:3001

E2E는 빌드된 Production 서버를 대상으로 합니다. 따라서 로컬에서는 먼저 `pnpm build`를 실행합니다.

Admin 앱은 User App 안쪽의 admin 라우트가 아니라 별도 Next.js 애플리케이션입니다.

## 개발 원칙

각 PHASE는 구현 → 테스트 → 검증 → 오류 수정 → 완료 판정 순으로 종료합니다. 앞 단계에 오류가 있으면 다음 PHASE로 진행하지 않습니다.

현재 단계에서는 금융 API, Supabase 스키마, 자동 채굴/정산 엔진을 연결하지 않습니다.
