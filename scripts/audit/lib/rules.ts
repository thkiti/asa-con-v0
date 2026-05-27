import path from "path"
import type { AuditResult, AuditRule } from "./types"
import {
  getRepoRoot,
  listRelativeSourceFiles,
  listSourceFiles,
  readFileRelative,
  resolveRelative,
} from "./paths"
import { scanFiles, scanForbiddenPatterns } from "./scan"

// --- Finance kernel (mirrors __tests__/lib/finance/boundaries.test.ts) ---

export const FINANCE_KERNEL_NO_STOCK: AuditRule = {
  id: "FINANCE_KERNEL_NO_STOCK",
  pattern:
    /issueStock\s*\(|receiveStock\s*\(|\.stock\.(update|create|upsert|delete)|stockLayer\.(create|update|delete)|stockTransaction\.create/,
  message: "Finance kernel must not mutate stock",
}

export const FINANCE_KERNEL_NO_SALE: AuditRule = {
  id: "FINANCE_KERNEL_NO_SALE",
  pattern: /sale\.(create|update|upsert|delete)/,
  message: "Finance kernel must not write sales",
}

export const FINANCE_KERNEL_NO_REACT: AuditRule = {
  id: "FINANCE_KERNEL_NO_REACT",
  pattern: /from ['"]react['"]|NextResponse|next\/server/,
  message: "Finance kernel must not import React or Next HTTP types",
}

export const FINANCE_KERNEL_RULES: AuditRule[] = [
  FINANCE_KERNEL_NO_STOCK,
  FINANCE_KERNEL_NO_SALE,
  FINANCE_KERNEL_NO_REACT,
]

export const FINANCE_INNER_TX_FILES = [
  "lib/finance/posting.ts",
  "lib/finance/voucher.ts",
  "lib/finance/journal.ts",
  "lib/finance/account-map.ts",
  "lib/finance/validation.ts",
]

export const NESTED_TX_PATTERN = /\.\$transaction\b/

// --- Reconciliation (mirrors reconciliation-boundaries.test.ts) ---

export const RECON_FILES = [
  "lib/finance/reconciliation.ts",
  "lib/finance/reconciliation-types.ts",
  "lib/finance/reconciliation-errors.ts",
  "lib/finance/close-policy.ts",
  "lib/finance/reconciliation-issue-rows.ts",
  "lib/finance/reconciliation-dashboard-rows.ts",
  "lib/finance/reconciliation-snapshot-capture.ts",
  "lib/finance/reconciliation-snapshot.ts",
  "lib/finance/reconciliation-snapshot-errors.ts",
]

export const RECON_NO_STOCK: AuditRule = {
  id: "RECON_NO_STOCK",
  pattern:
    /issueStock\s*\(|receiveStock\s*\(|\.stock\.(update|create|upsert|delete)|stockLayer\.|stockTransaction\.create/,
  message: "Reconciliation modules must not mutate stock",
}

export const RECON_NO_SALE_PAYMENT: AuditRule = {
  id: "RECON_NO_SALE_PAYMENT",
  pattern:
    /\.sale\.(create|update|upsert|delete)|\.saleItem\.|\.payment\.(create|update)|sale\.create|postSaleVoucher|postDocument|issueStock/,
  message: "Reconciliation modules must not write sales or payments",
}

export const RECON_NO_VOUCHER_JOURNAL: AuditRule = {
  id: "RECON_NO_VOUCHER_JOURNAL",
  pattern:
    /postOperationalVoucher|postSaleVoucher|voucher\.create|journalEntry\.create/,
  message: "Reconciliation modules must not create vouchers or journals",
}

export const RECON_NO_NESTED_TX: AuditRule = {
  id: "RECON_NO_NESTED_TX",
  pattern: NESTED_TX_PATTERN,
  message: "Reconciliation modules must not open nested transactions",
}

export const RECON_NO_REACT: AuditRule = {
  id: "RECON_NO_REACT",
  pattern: /from ['"]react['"]|NextResponse|next\/server/,
  message: "Reconciliation modules must not import React or Next HTTP types",
}

export const RECON_RULES: AuditRule[] = [
  RECON_NO_STOCK,
  RECON_NO_SALE_PAYMENT,
  RECON_NO_VOUCHER_JOURNAL,
  RECON_NO_NESTED_TX,
  RECON_NO_REACT,
]

export const RECON_CROSS_DOMAIN_SQL: AuditRule = {
  id: "RECON_CROSS_DOMAIN_SQL",
  pattern:
    /stockTransaction.*saleItem|saleItem.*journalEntry|stock\.findMany.*journalEntry/,
  message: "Reconciliation must not use cross-domain SQL heuristics",
}

// --- Operational wiring (mirrors operational-wiring.test.ts) ---

export const OPERATIONAL_WIRING_FILES = [
  "lib/pos/checkout.ts",
  "lib/pos/checkout-finance.ts",
  "lib/stock/posting.ts",
  "lib/stock/posting-finance.ts",
]

export const OPERATIONAL_WIRING_FORBIDDEN_IMPORT: AuditRule = {
  id: "OPERATIONAL_WIRING_FORBIDDEN_IMPORT",
  pattern:
    /from ['"]@\/lib\/finance\/(account-map|voucher|journal|validation)|resolveAccountsFor|createVoucherWithLines|createJournalForVoucher|postOperationalVoucher/,
  message: "Operational modules must use posting facade only",
}

export const OPERATIONAL_WIRING_DIRECT_ENV: AuditRule = {
  id: "OPERATIONAL_WIRING_DIRECT_ENV",
  pattern: /process\.env\.FINANCE_POSTING_ENABLED/,
  message: "Orchestrators must use isFinancePostingEnabled(), not direct env reads",
}

export const OPERATIONAL_ORCHESTRATOR_FILES = [
  "lib/pos/checkout.ts",
  "lib/stock/posting.ts",
]

// --- Finance UI (mirrors finance-ui-boundaries.test.ts) ---

export const UI_SCAN_DIRS = [
  "app/(main)/finance/reconciliation",
  "app/(main)/finance/periods",
  "components/finance",
  "lib/finance-ui",
]

export const UI_FORBIDDEN: AuditRule = {
  id: "UI_FORBIDDEN",
  pattern:
    /prisma|close-policy|close-period|@\/lib\/finance\/reconciliation['"]|@\/lib\/finance\/gl-balance|@\/lib\/finance\/account-map|@\/lib\/finance\/voucher|@\/lib\/finance\/journal|postSaleVoucher|postOperationalVoucher/,
  message: "Finance UI must not import kernel or Prisma directly",
}

// --- Finance API (mirrors finance-api-boundaries.test.ts) ---

export const API_FORBIDDEN_POSTING: AuditRule = {
  id: "API_FORBIDDEN_POSTING",
  pattern: /account-map|postSaleVoucher|postOperationalVoucher|\/voucher|\/journal/,
  message: "Finance API routes must not import posting internals",
}

export const API_FORBIDDEN_STOCK: AuditRule = {
  id: "API_FORBIDDEN_STOCK",
  pattern:
    /issueStock\s*\(|receiveStock\s*\(|from ['"]@\/lib\/stock\/(issue|receive)/,
  message: "Finance API routes must not call stock mutation",
}

export const API_NO_REACT: AuditRule = {
  id: "API_NO_REACT",
  pattern: /from ['"]react['"]/,
  message: "Finance API routes must not import React",
}

export const API_RULES: AuditRule[] = [
  API_FORBIDDEN_POSTING,
  API_FORBIDDEN_STOCK,
  API_NO_REACT,
]

// --- Architecture-wide (mirrors ARCHITECTURE_GUARDS.md) ---

export const LEDGER_CALLERS_ALLOWED = [
  "lib/stock/posting.ts",
  "lib/pos/checkout.ts",
  "lib/stock/ledger.ts",
  "scripts/",
]

export const LEDGER_CALLERS: AuditRule = {
  id: "LEDGER_CALLERS",
  pattern: /issueStock\s*\(|receiveStock\s*\(/,
  allowedRelativePaths: LEDGER_CALLERS_ALLOWED,
  message: "issueStock/receiveStock only allowed in posting, checkout, ledger, scripts",
}

export const STOCK_PRISMA_WRITERS_ALLOWED = [
  "lib/stock/issue-stock.ts",
  "lib/stock/receive-stock.ts",
  "lib/stock/layers.ts",
  "scripts/",
]

export const STOCK_PRISMA_WRITERS: AuditRule = {
  id: "STOCK_PRISMA_WRITERS",
  pattern:
    /(\.stock\.(create|update|upsert|delete)|\.stockLayer\.(create|update|delete)|\.stockTransaction\.create)/,
  allowedRelativePaths: STOCK_PRISMA_WRITERS_ALLOWED,
  message: "Stock Prisma writes only allowed in issue-stock, receive-stock, layers, scripts",
}

export const LIB_NO_REACT: AuditRule = {
  id: "LIB_NO_REACT",
  pattern: /from ['"]react['"]|useState|useEffect|useCallback|useMemo/,
  message: "lib/* must not import React hooks or components",
}

export const LIB_NO_NEXT_HTTP: AuditRule = {
  id: "LIB_NO_NEXT_HTTP",
  pattern: /NextResponse|from ['"]next\/server['"]|from ['"]next\/headers['"]/,
  message: "lib/* must not import Next.js HTTP utilities",
}

export const LIB_NO_APP_IMPORT: AuditRule = {
  id: "LIB_NO_APP_IMPORT",
  pattern: /from ['"]@\/app\/|from ['"]\.\.\/.*app\//,
  message: "lib/* must not import from app/",
}

export const LIB_NO_COMPONENTS_IMPORT: AuditRule = {
  id: "LIB_NO_COMPONENTS_IMPORT",
  pattern: /from ['"]@\/components\//,
  message: "lib/* must not import from components/",
}

export const STOCK_INNER_TX_FILES = [
  "lib/stock/issue-stock.ts",
  "lib/stock/receive-stock.ts",
  "lib/stock/layers.ts",
]

export const STOCK_INNER_UNEXPECTED_TX: AuditRule = {
  id: "STOCK_INNER_UNEXPECTED_TX",
  pattern: NESTED_TX_PATTERN,
  message: "Inner stock modules must not open prisma.$transaction",
}

export const FINANCE_INNER_UNEXPECTED_TX: AuditRule = {
  id: "FINANCE_INNER_UNEXPECTED_TX",
  pattern: NESTED_TX_PATTERN,
  message: "Finance inner modules must not open nested prisma.$transaction",
}

// --- Audit builders ---

export function auditFinanceKernel(repoRoot?: string): AuditResult {
  const files = listRelativeSourceFiles("lib/finance", {
    extensions: [".ts"],
    excludeTest: true,
  })
  return scanFiles("Finance kernel boundaries", files, FINANCE_KERNEL_RULES, repoRoot)
}

export function auditReconciliation(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const reconFiles = RECON_FILES.map((rel) => resolveRelative(rel, root))
  const reconResult = scanFiles(
    "Reconciliation module boundaries",
    reconFiles,
    RECON_RULES,
    root
  )

  const crossDomainSource = readFileRelative("lib/finance/reconciliation.ts", root)
  const crossDomainHits = scanForbiddenPatterns(
    crossDomainSource,
    RECON_CROSS_DOMAIN_SQL.pattern,
    RECON_CROSS_DOMAIN_SQL.id,
    "lib/finance/reconciliation.ts"
  )

  const violations = [...reconResult.violations, ...crossDomainHits]

  return {
    name: "Reconciliation boundaries",
    passed: violations.length === 0,
    violations,
    filesScanned: reconResult.filesScanned,
  }
}

export function auditOperationalWiring(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const wiredFiles = OPERATIONAL_WIRING_FILES.map((rel) => resolveRelative(rel, root))
  const wiredResult = scanFiles(
    "Operational wiring forbidden imports",
    wiredFiles,
    [OPERATIONAL_WIRING_FORBIDDEN_IMPORT],
    root
  )

  const orchestratorFiles = OPERATIONAL_ORCHESTRATOR_FILES.map((rel) =>
    resolveRelative(rel, root)
  )
  const envResult = scanFiles(
    "Operational orchestrator env access",
    orchestratorFiles,
    [OPERATIONAL_WIRING_DIRECT_ENV],
    root
  )

  const violations = [...wiredResult.violations, ...envResult.violations]

  return {
    name: "Finance operational wiring",
    passed: violations.length === 0,
    violations,
    filesScanned: wiredResult.filesScanned + envResult.filesScanned,
  }
}

export function auditFinanceUi(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const files = UI_SCAN_DIRS.flatMap((dir) =>
    listSourceFiles(path.join(root, dir), { excludeTest: true })
  )
  return scanFiles("Finance UI boundaries", files, [UI_FORBIDDEN], root)
}

export function auditFinanceApi(repoRoot?: string): AuditResult {
  const files = listRelativeSourceFiles("app/api/finance", {
    extensions: [".ts"],
    excludeTest: true,
  })
  return scanFiles("Finance API boundaries", files, API_RULES, repoRoot)
}

export function auditFinanceInnerTx(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const files = FINANCE_INNER_TX_FILES.map((rel) => resolveRelative(rel, root))
  return scanFiles(
    "Finance inner module nested transactions",
    files,
    [FINANCE_INNER_UNEXPECTED_TX],
    root
  )
}

export function auditReconNestedTx(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const files = RECON_FILES.map((rel) => resolveRelative(rel, root))
  return scanFiles(
    "Reconciliation nested transactions",
    files,
    [RECON_NO_NESTED_TX],
    root
  )
}

export function auditStockInnerTx(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const files = STOCK_INNER_TX_FILES.map((rel) => resolveRelative(rel, root))
  return scanFiles(
    "Stock inner module nested transactions",
    files,
    [STOCK_INNER_UNEXPECTED_TX],
    root
  )
}

export function auditLedgerCallers(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const scanRoots = ["app", "lib", "components", "scripts"].map((d) =>
    path.join(root, d)
  )
  const files = scanRoots.flatMap((dir) =>
    listSourceFiles(dir, { extensions: [".ts"], excludeTest: true })
  )
  return scanFiles("Ledger caller allowlist", files, [LEDGER_CALLERS], root)
}

export function auditStockPrismaWriters(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const scanRoots = ["app", "lib", "components", "scripts"].map((d) =>
    path.join(root, d)
  )
  const files = scanRoots.flatMap((dir) =>
    listSourceFiles(dir, { extensions: [".ts"], excludeTest: true })
  )
  return scanFiles("Stock Prisma writer allowlist", files, [STOCK_PRISMA_WRITERS], root)
}

export function auditLibFrameworkBoundaries(repoRoot?: string): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const libFiles = listRelativeSourceFiles("lib", { excludeTest: true })
  const libResult = scanFiles(
    "lib/* framework boundaries",
    libFiles,
    [LIB_NO_REACT, LIB_NO_APP_IMPORT, LIB_NO_COMPONENTS_IMPORT],
    root
  )

  const stockFiles = listRelativeSourceFiles("lib/stock", { excludeTest: true })
  const stockHttpResult = scanFiles(
    "lib/stock Next.js HTTP boundaries",
    stockFiles,
    [LIB_NO_NEXT_HTTP],
    root
  )

  const violations = [...libResult.violations, ...stockHttpResult.violations]

  return {
    name: "lib/* framework boundaries",
    passed: violations.length === 0,
    violations,
    filesScanned: libResult.filesScanned + stockHttpResult.filesScanned,
  }
}

export function runFinanceBoundaryAudits(repoRoot?: string): AuditResult[] {
  return [
    auditFinanceKernel(repoRoot),
    auditReconciliation(repoRoot),
    auditOperationalWiring(repoRoot),
  ]
}

export function runUiBoundaryAudits(repoRoot?: string): AuditResult[] {
  return [auditFinanceUi(repoRoot), auditFinanceApi(repoRoot)]
}

export function runNestedTxAudits(repoRoot?: string): AuditResult[] {
  return [
    auditFinanceInnerTx(repoRoot),
    auditReconNestedTx(repoRoot),
    auditStockInnerTx(repoRoot),
  ]
}

export function runArchitectureAudits(repoRoot?: string): AuditResult[] {
  return [
    ...runFinanceBoundaryAudits(repoRoot),
    ...runUiBoundaryAudits(repoRoot),
    ...runNestedTxAudits(repoRoot),
    auditLedgerCallers(repoRoot),
    auditStockPrismaWriters(repoRoot),
    auditLibFrameworkBoundaries(repoRoot),
  ]
}
