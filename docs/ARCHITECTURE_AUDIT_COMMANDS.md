# Architecture Audit Commands

Status: Active  
Scope: npm scripts under `scripts/audit/` that enforce modular monolith boundaries  
Related: [ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md)

These commands centralize the grep-style checks previously duplicated in Jest boundary tests. Run them locally before opening a PR or wire them into CI.

---

## Quick start

```bash
npm run audit:all        # full architecture audit (same as audit:architecture)
npm run audit:finance    # finance kernel + reconciliation + operational wiring
npm run audit:ui         # finance UI + finance API routes
npm run audit:tx         # nested $transaction guards
```

All audit scripts exit with code **1** on failure and **0** when every check passes.

---

## Commands

### `npm run audit:all` / `npm run audit:architecture`

Runs every audit below in one pass and prints a summary.

| Check | What it enforces |
|-------|------------------|
| Finance kernel boundaries | No stock/sale writes, no React/Next in `lib/finance/**` |
| Reconciliation boundaries | Read-only reconciliation/close-policy modules |
| Operational wiring | POS/stock orchestrators use posting facade only |
| Finance UI boundaries | No Prisma or finance kernel imports in UI layers |
| Finance API boundaries | No posting internals or stock mutation in API routes |
| Nested transactions | No `$transaction` in finance inner or stock inner modules |
| Ledger caller allowlist | `issueStock` / `receiveStock` only in posting, checkout, ledger, scripts |
| Stock Prisma writer allowlist | Stock row/layer/ledger writes only in issue/receive/layers, scripts |
| lib framework boundaries | No React, Next HTTP, or app/components imports in `lib/**` |

**Example failure output:**

```
[FAIL] Finance kernel boundaries (23 files)
  FINANCE_KERNEL_NO_STOCK @ lib/finance/posting-helper.ts:14 — "issueStock("
--- Summary ---
11/12 audits passed
```

### `npm run audit:finance`

Finance-domain boundaries only:

- **Finance kernel** — mirrors `__tests__/lib/finance/boundaries.test.ts`
- **Reconciliation** — mirrors `__tests__/lib/finance/reconciliation-boundaries.test.ts`
- **Operational wiring** — mirrors `__tests__/lib/finance/operational-wiring.test.ts`

### `npm run audit:ui`

UI and HTTP entry-point boundaries:

- **Finance UI** — `app/(main)/finance/reconciliation`, `periods`, `components/finance`, `lib/finance-ui`
- **Finance API** — `app/api/finance/**/*.ts`

Mirrors `__tests__/components/finance/finance-ui-boundaries.test.ts` and `__tests__/app/api/finance/finance-api-boundaries.test.ts`.

### `npm run audit:tx`

Transaction nesting guards:

- Finance inner modules: `posting.ts`, `voucher.ts`, `journal.ts`, `account-map.ts`, `validation.ts`
- Reconciliation modules: `reconciliation*.ts`, `close-policy.ts`
- Stock inner modules: `issue-stock.ts`, `receive-stock.ts`, `layers.ts`

Allowed `$transaction` owners (posting, checkout, ledger when `tx` omitted) are **not** scanned here — see architecture audit for caller/writer allowlists.

---

## CI usage

Add to your pipeline after install:

```yaml
- run: npm run audit:all
- run: npm test
- run: npm run build
```

Audits do not require a database. `npm run build` still needs `DATABASE_URL` for Prisma generate/build in this repo.

On failure, the script prints `ruleId`, file path, line number, and the matched snippet. Fix the violation or update the allowlist in `scripts/audit/lib/rules.ts` together with [ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md).

---

## Extending rules

All regex rules live in **`scripts/audit/lib/rules.ts`**.

1. Add an `AuditRule` constant with a unique `id`, `pattern`, and optional `message`.
2. Group it into the appropriate `*_RULES` array or `audit*()` builder function.
3. Mirror the rule in the matching Jest boundary test (if one exists) so tests and CLI stay aligned.
4. Document the boundary change in [ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md).

**Allowlist example** (ledger callers):

```typescript
export const LEDGER_CALLERS: AuditRule = {
  id: "LEDGER_CALLERS",
  pattern: /issueStock\s*\(|receiveStock\s*\(/,
  allowedRelativePaths: [
    "lib/stock/posting.ts",
    "lib/stock/ledger.ts",
    "scripts/",
  ],
}
```

Files matching `allowedRelativePaths` are skipped for that rule. Use trailing `/` for directory prefixes (e.g. `scripts/`).

**Shared scan helpers** (`scripts/audit/lib/scan.ts`):

- `scanForbiddenPatterns(source, pattern, ruleId)` — unit-test friendly
- `scanFiles(name, files, rules)` — batch audit with allowlists
- `runAudits(() => results, { exitOnFail: true })` — CLI entry helper

---

## Layout

```
scripts/audit/
├── architecture-audit.ts      # npm run audit:architecture / audit:all
├── finance-boundary-audit.ts
├── ui-boundary-audit.ts
├── no-nested-tx-audit.ts
└── lib/
    ├── types.ts
    ├── paths.ts
    ├── scan.ts
    └── rules.ts               # single source of regex rules
```

Tests: `__tests__/scripts/audit/`

---

## Related docs

- [ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md) — boundary rationale and manual grep patterns
- [01_MODULAR_MONOLITH_BOUNDARIES.md](./01_MODULAR_MONOLITH_BOUNDARIES.md)
