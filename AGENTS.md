# BLUECHIP Engineering Guide

## Stack baseline

- Next.js 16.3.3 (Active LTS)
- React 19.3
- TypeScript 6.0.2
- Tailwind CSS 4.3.3
- Motion 13.4.0
- Geist 1.7.2
- Node.js 24 in CI

## Architecture rules

1. Prefer Server Components by default. Use `"use client"` only at the smallest interactive boundary.
2. Prefer typed domain models in `src/lib`.
3. Prefer browser-native or Motion animations that do not cause a React state update every frame.
4. SVG path morphing is for shape interpolation; never claim that path animation is inherently GPU-accelerated.
5. Use transform and opacity for compositor-friendly movement and visibility effects.
6. Real financial data and real transaction actions must be isolated behind authenticated server-side integrations. Current values are synthetic demo data.

## Naming

- React components: PascalCase
- Functions/hooks/variables: camelCase
- Module-level immutable constants: SCREAMING_SNAKE_CASE
- Types: PascalCase
- Feature files: kebab-case
- Next special files: `page.tsx`, `layout.tsx`, `route.ts`, etc.
- CSS custom properties: kebab-case
- Route segments: lowercase kebab-case

## Quality gates

Every production change should pass:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```
