# SPEC-001 implementation record

## Status

Implemented as the first executable backend slice on 1 October 2026.

## Accepted implementation choices

- HTTP base path: `/api/v1`.
- Domain module: `src/messaging` inside the modular monolith.
- Development actor boundary: `x-actor-id`, `x-actor-type` and, for clinicians,
  `x-organization-id`. This is a local adapter for tests and development; it
  is not a replacement for the accepted Firebase Authentication boundary in
  SPEC-002/003.
- Problem responses use RFC 9457-shaped JSON fields with a project problem URL,
  code, request ID and safe validation details.
- Notice delivery uses an in-app delivery adapter. The external notification
  provider remains a later notification/outbox implementation decision.
- Screening rules are centralized, versioned records. The initial deterministic
  set covers phone-like sequences, email, external channel/URL, IBAN-like
  values, obfuscated digit words and a small spam/abuse keyword set. Custom
  keyword rules use `OTHER_CONFIGURED_KEYWORD`.
- Message edit window and maximum edit count remain unconfigured because
  SPEC-001 marks them `Unknown`; no arbitrary product limit was introduced.
- The current adapter is in-memory so the feature can be tested without a
  database. PostgreSQL/Prisma persistence, physical schema and migration remain
  foundation work outside SPEC-001’s physical schema scope.

## Implemented operations

- Conversation creation/listing for development setup.
- Participant message create/list/edit with client-request idempotency and stale
  revision conflict handling.
- Participant-safe current-message views and super-admin revision views.
- Screening rule list/create/update, risk flag list/detail/decision.
- Complaint/support case creation and super-admin resolution workflow.
- Admin follow-up creation, bilateral YES/NO answers and conflict detection.
- Organization notice YES/NO decision, in-app delivery, status read and
  idempotent retry.
- Audit event listing and required message/revision/screening/case/follow-up/
  notice events.

## Verification

- `corepack pnpm@10.12.4 typecheck`
- `corepack pnpm@10.12.4 test`
- `corepack pnpm@10.12.4 start` plus a real HTTP conversation creation probe.

The feature has no web UI in this slice, so Playwright has no user-facing page
flow to execute. The Playwright MCP connection was checked separately; browser
flow validation will be required when a UI is added.
