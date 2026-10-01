# Local runtime implementation kaydı

- Safe env template: `.env.example`
- Runbook: `docs/local-development.md`
- Smoke command: `corepack pnpm@10.12.4 smoke`
- Runtime config loader: `src/main.ts` + `src/platform/config.ts`

Local smoke, gerçek process üzerinde liveness/readiness/public discovery ve
unauthenticated protected endpoint davranışını doğrular. Local runtime
in-memory’dir; restart ile domain state kalıcı değildir.
