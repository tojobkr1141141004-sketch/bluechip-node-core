# BLUECHIP Edge Asset Hub

Production-oriented dashboard demo migrated from the original static HTML prototype.

## Stack

- Next.js 16.3.3 (Active LTS)
- React 19.3
- TypeScript 6.0.2
- Tailwind CSS 4.3.3
- Motion 13.4.0
- Geist 1.7.2
- Lucide React 1.47.0
- Node.js 24 in CI

## Architecture

The app uses the Next.js App Router with Server Components by default and a small client boundary for dashboard interactivity.

Key paths:

- `src/app/page.tsx`: route entry
- `src/components/dashboard/dashboard-shell.tsx`: interactive dashboard feature
- `src/lib/nodes.ts`: typed sample edge-node model
- `src/app/api/health/route.ts`: liveness endpoint
- `tests/dashboard.spec.ts`: end-to-end smoke coverage
- `next.config.ts`: React Compiler, typed routes, Cache Components, and security headers

## Performance

- Motion 13.4 for SVG path morphing and micro-interactions.
- CSS `transform`/opacity effects use compositor-friendly patterns.
- React state updates are throttled to low-frequency UI changes; animation work remains outside the React render loop where possible.
- `prefers-reduced-motion` is respected.
- No third-party runtime CDN dependencies are required.

SVG path morphing itself should not be described as guaranteed GPU-rendered. Compositor-friendly transforms and opacity are used where appropriate.

## Safety boundary

The dashboard is a visual/telemetry demo. Values are synthetic and are not claims about real assets, investment returns, dividends, gold holdings, deposits, escrow, or withdrawals.

## Quality gates

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```
