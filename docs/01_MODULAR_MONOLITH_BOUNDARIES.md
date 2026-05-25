# Modular Monolith Boundaries

Status: Active  
Scope: One repo, one Next.js app, one Prisma schema (Phase 1+), one database

## Unified stack

| Layer | Rule |
|-------|------|
| Repository | One git repo (`asa-con-v0`) |
| Application | One Next.js App Router project |
| Data | One `prisma/schema.prisma` (Phase 1+) |
| Deployment | One deployable app |

## Layer responsibilities

| Layer | Responsibility | Must not |
|-------|----------------|----------|
| `app/**/page.tsx` | Layout, navigation, fetch hooks | Business rules, Prisma |
| `app/api/**/route.ts` | HTTP parse, auth, status codes | Long workflows |
| `lib/<domain>/**` | Services, validation, pure utils | React, `NextResponse` |
| `components/**` | Display, local UI state | Prisma, permission matrices |

## Locked invariants

1. **POS → stock:** POS calls `issueStock()` only — no direct ledger Prisma in routes.
2. **SAVE = draft:** Stock document save persists document + lines only — no stock transactions.
3. **POST = ledger:** Real stock mutations happen only on document POST via `lib/stock/posting.ts`.
4. **One summary path:** Screen, print, and PDF share `lib/stock/summary.ts`.
5. **Central permissions:** Route and menu access live in `lib/permissions/`.
6. **Incremental delivery:** One vertical slice per phase — no big-bang port from `asa-con`.

## Stock mutation boundary

Only these may call `issueStock()` (when implemented):

- `lib/stock/posting.ts`
- `lib/pos/checkout.ts`
- Dev seed scripts (non-production)

SAVE / SEND / CONFIRM / SHIP change document status only.

## Transaction rule

Only top-level domain services open `prisma.$transaction`. Inner functions accept `tx: Prisma.TransactionClient` and must not open nested transactions.

## Out of scope (this track)

- Multiple repos or microservices
- Copying legacy code from `asa-con`
- Group summary persisted as stock rows
