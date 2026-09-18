# APEX-MATRIX Engineering Guide

## Phase 1 baseline

- User App and Admin App are separate Next.js applications.
- Root workspace uses pnpm + Turborepo.
- Shared code belongs in packages/ui, database, types, validation, calculations, or config.
- Admin functionality must not be added as a route inside the User App.
- Financial integrations and Supabase business logic are intentionally not part of Phase 1.

## Naming

- React components: PascalCase
- Functions/hooks/variables: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types: PascalCase
- Feature files: kebab-case
- Next special files: page.tsx, layout.tsx, route.ts

## Quality gates

For Phase 1:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

Do not declare a phase complete when a required gate is failing.
