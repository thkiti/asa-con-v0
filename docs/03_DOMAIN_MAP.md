# Domain Map

## Business areas

```
SYSTEM
 ├─ HO
 │    ├─ Finance
 │    ├─ Admin
 │    └─ Operations
 └─ Shop
      ├─ POS
      └─ Stock documents
```

## Roles

| Role | Primary areas |
|------|---------------|
| `HO_FINANCE` | Finance (+ broad read) |
| `HO_ADMIN` | Admin, Finance, Operations, Shop |
| `HO_OPERATIONS` | Operations, Shop |
| `SH_STAFF` | Shop, POS, stock documents |

## Route map (stubs in Phase 0)

| Area | Route | Module |
|------|-------|--------|
| Home | `/` | — |
| Finance | `/finance` | `lib/finance/` |
| Finance periods | `/finance/periods` | `lib/finance/period-*`, `lib/finance-ui/` |
| Admin | `/admin` | (Admin services, Phase 7+) |
| Operations | `/operations` | `lib/stock/` (HO ops queue, later) |
| Shop | `/shop` | `lib/stock/`, `lib/pos/` |
| Login | `/login` | `lib/auth/`, `lib/permissions/` |
| Health | `/api/health` | — |
| Finance periods API | `/api/finance/periods` | `app/api/finance/periods/` |
| POS checkout API | `/api/pos/checkout` | `app/api/pos/checkout/` |

Routes not yet created: `/full-pos`, `/stock-document` — added with their vertical slices.

## Module ownership

| Concern | Owner |
|---------|-------|
| `issueStock`, FIFO, stock qty | `lib/stock/ledger.ts` |
| Document save / send / post | `lib/stock/document.ts`, `posting.ts` |
| Group summary, print rows | `lib/stock/summary.ts` |
| Path RBAC, menu | `lib/permissions/` |
| POS sale checkout | `lib/pos/` → calls `lib/stock/ledger.ts` |
| GL / vouchers | `lib/finance/` |

## Cross-domain calls

| From | To | Pattern |
|------|-----|---------|
| POS | Stock | `issueStock()` only |
| Stock POST | Finance | Voucher hooks (when enabled) |
| Any | Month gate | `lib/shared/` (Phase 1+) |
| UI / API | Permissions | `lib/permissions/` first |
