import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"

export const JUNE_UAT_RESET_CONFIRM_TOKEN = "JUNE_UAT_RESET_CONFIRMED"

export const DEFAULT_UAT_RESET_FROM = "2026-06-01"
export const DEFAULT_UAT_RESET_BEFORE = "2026-07-01"

/** GL ref types removed for June UAT POS/settlement/stock posting. */
export const JUNE_UAT_OPERATIONAL_REF_TYPES: string[] = [
  FINANCE_REF_TYPES.POS_SALE,
  FINANCE_REF_TYPES.POS_REFUND,
  FINANCE_REF_TYPES.STOCK_DOC_POST,
  FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
  FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
]

/** Prisma delegate keys that must never be deleted by this reset. */
export const PROTECTED_MASTER_DELETE_KEYS = [
  "legalEntity",
  "branch",
  "staff",
  "product",
  "referenceStock",
  "glAccount",
  "accountingPeriod",
  "pricingPolicy",
  "sellingPrice",
  "stock",
  "stockLayer",
] as const

export type UatResetDateRange = {
  from: Date
  before: Date
  fromDateKey: string
  beforeDateKey: string
  periodKey: string
  periodCounter: string
}

export type UatResetCliOptions = {
  execute: boolean
  confirm: string
  fromDateKey: string
  beforeDateKey: string
}

export type UatResetScopeIds = {
  saleIds: string[]
  refundIds: string[]
  collectorReportIds: string[]
  stockDocumentIds: string[]
  voucherIds: string[]
  archiveIds: string[]
}

export type UatResetTableCounts = {
  documentArchiveLink: number
  documentArchive: number
  receiptArchiveUnlink: number
  posPayInEvidence: number
  collectorReport: number
  refund: number
  sale: number
  saleItem: number
  payment: number
  receipt: number
  stockTransaction: number
  stockDocument: number
  stockDocumentLine: number
  voucher: number
  voucherLine: number
  journalEntry: number
  journalEntryLine: number
  reconciliationSnapshot: number
  workTimeEntry: number
  documentCounter: number
}

export type ProtectedMasterCounts = {
  legalEntity: number
  branch: number
  staff: number
  product: number
  referenceStock: number
  glAccount: number
  accountingPeriod: number
  pricingPolicy: number
  baselineSaleBeforeRange: number
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const m = DATE_KEY_RE.exec(dateKey.trim())
  if (!m) {
    throw new Error(`Invalid date key "${dateKey}" — expected YYYY-MM-DD`)
  }
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

export function bangkokRangeStart(dateKey: string): Date {
  const { y, m, d } = parseDateKey(dateKey)
  return new Date(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+07:00`)
}

export function parseUatResetDateRange(
  fromDateKey: string,
  beforeDateKey: string
): UatResetDateRange {
  const from = bangkokRangeStart(fromDateKey)
  const before = bangkokRangeStart(beforeDateKey)
  if (!(from.getTime() < before.getTime())) {
    throw new Error(
      `--from (${fromDateKey}) must be strictly before --before (${beforeDateKey})`
    )
  }

  const { y, m } = parseDateKey(fromDateKey)
  return {
    from,
    before,
    fromDateKey,
    beforeDateKey,
    periodKey: `${y}-${pad2(m)}`,
    periodCounter: `${y}${pad2(m)}`,
  }
}

export function isInstantInUatResetRange(
  instant: Date,
  range: UatResetDateRange
): boolean {
  const t = instant.getTime()
  return t >= range.from.getTime() && t < range.before.getTime()
}

export function isWorkDateInUatResetRange(
  workDate: string,
  range: UatResetDateRange
): boolean {
  return workDate >= range.fromDateKey && workDate < range.beforeDateKey
}

export function parseUatResetArgs(argv: string[]): UatResetCliOptions {
  const execute = argv.includes("--execute")
  const confirmArg = argv.find((a) => a.startsWith("--confirm="))
  const fromArg = argv.find((a) => a.startsWith("--from="))
  const beforeArg = argv.find((a) => a.startsWith("--before="))
  return {
    execute,
    confirm: confirmArg?.split("=")[1] ?? "",
    fromDateKey: fromArg?.split("=")[1] ?? DEFAULT_UAT_RESET_FROM,
    beforeDateKey: beforeArg?.split("=")[1] ?? DEFAULT_UAT_RESET_BEFORE,
  }
}

export function validateUatResetExecute(
  options: UatResetCliOptions,
  connectionString: string
): void {
  if (!options.execute) return

  const dbTarget = parseDatabaseTarget(connectionString)
  const needsConfirm = !dbTarget.isLocalhost

  if (needsConfirm && options.confirm !== JUNE_UAT_RESET_CONFIRM_TOKEN) {
    throw new Error(
      `Refusing execute on remote database: pass --confirm=${JUNE_UAT_RESET_CONFIRM_TOKEN}`
    )
  }
}

export function createdAtRangeWhere(range: UatResetDateRange) {
  return { gte: range.from, lt: range.before }
}

export function datedRangeWhere(range: UatResetDateRange) {
  return { gte: range.from, lt: range.before }
}

export function workDateRangeWhere(range: UatResetDateRange) {
  return { gte: range.fromDateKey, lt: range.beforeDateKey }
}

export function collectorReportScopeWhere(range: UatResetDateRange) {
  return {
    OR: [
      { createdAt: createdAtRangeWhere(range) },
      { collectNo: { contains: `-${range.periodCounter}-` } },
    ],
  }
}

export function reconciliationSnapshotScopeWhere(range: UatResetDateRange) {
  return {
    OR: [
      { createdAt: createdAtRangeWhere(range) },
      { periodKey: range.periodKey },
      {
        fromDate: {
          gte: range.from,
          lt: range.before,
        },
      },
    ],
  }
}

export function buildStockTransactionDeleteWhere(
  scope: Pick<UatResetScopeIds, "saleIds" | "stockDocumentIds">,
  range: UatResetDateRange
) {
  const clauses: Record<string, unknown>[] = []
  if (scope.saleIds.length > 0) {
    clauses.push({ refId: { in: scope.saleIds } })
    clauses.push({
      date: datedRangeWhere(range),
      refId: { in: scope.saleIds },
    })
  }
  if (scope.stockDocumentIds.length > 0) {
    clauses.push({ documentId: { in: scope.stockDocumentIds } })
  }
  if (clauses.length === 0) {
    return { id: { in: [] as string[] } }
  }
  return { OR: clauses }
}

export function buildOperationalVoucherScopeWhere(
  scope: Pick<
    UatResetScopeIds,
    "saleIds" | "refundIds" | "collectorReportIds" | "stockDocumentIds"
  >,
  range: UatResetDateRange
) {
  const refIdClauses: Record<string, unknown>[] = []
  if (scope.saleIds.length > 0) {
    refIdClauses.push({
      refType: FINANCE_REF_TYPES.POS_SALE,
      refId: { in: scope.saleIds },
    })
  }
  if (scope.refundIds.length > 0) {
    refIdClauses.push({
      refType: FINANCE_REF_TYPES.POS_REFUND,
      refId: { in: scope.refundIds },
    })
  }
  if (scope.collectorReportIds.length > 0) {
    refIdClauses.push({
      refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
      refId: { in: scope.collectorReportIds },
    })
    refIdClauses.push({
      refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
      refId: { in: scope.collectorReportIds },
    })
  }
  if (scope.stockDocumentIds.length > 0) {
    refIdClauses.push({
      refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
      refId: { in: scope.stockDocumentIds },
    })
  }

  return {
    refType: { in: JUNE_UAT_OPERATIONAL_REF_TYPES },
    OR: [{ date: datedRangeWhere(range) }, ...refIdClauses],
  }
}

type ScopePrisma = {
  sale: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>
  }
  refund: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>
  }
  collectorReport: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>
  }
  stockDocument: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>
  }
  voucher: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>
  }
  documentArchiveLink: {
    findMany: (args: unknown) => Promise<Array<{ archiveId: string }>>
  }
  documentArchive: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>
  }
  receipt: {
    findMany: (
      args: unknown
    ) => Promise<Array<{ documentArchiveId: string | null }>>
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)]
}

export async function resolveUatResetScope(
  prisma: ScopePrisma,
  range: UatResetDateRange
): Promise<UatResetScopeIds> {
  const createdAtWhere = { createdAt: createdAtRangeWhere(range) }
  const [sales, refunds, collectors, stockDocuments] = await Promise.all([
    prisma.sale.findMany({ where: createdAtWhere, select: { id: true } }),
    prisma.refund.findMany({ where: createdAtWhere, select: { id: true } }),
    prisma.collectorReport.findMany({
      where: collectorReportScopeWhere(range),
      select: { id: true },
    }),
    prisma.stockDocument.findMany({
      where: { date: datedRangeWhere(range) },
      select: { id: true },
    }),
  ])

  const saleIds = sales.map((s) => s.id)
  const refundIds = refunds.map((r) => r.id)
  const collectorReportIds = collectors.map((c) => c.id)
  const stockDocumentIds = stockDocuments.map((d) => d.id)

  const vouchers = await prisma.voucher.findMany({
    where: buildOperationalVoucherScopeWhere(
      { saleIds, refundIds, collectorReportIds, stockDocumentIds },
      range
    ),
    select: { id: true },
  })
  const voucherIds = vouchers.map((v) => v.id)

  const [links, receiptRows, legacyArchives] = await Promise.all([
    saleIds.length + refundIds.length + collectorReportIds.length > 0
      ? prisma.documentArchiveLink.findMany({
          where: {
            OR: [
              ...(saleIds.length > 0
                ? [{ documentKind: "REC" as const, documentId: { in: saleIds } }]
                : []),
              ...(refundIds.length > 0
                ? [{ documentKind: "REF" as const, documentId: { in: refundIds } }]
                : []),
              ...(collectorReportIds.length > 0
                ? [{ documentKind: "COL" as const, documentId: { in: collectorReportIds } }]
                : []),
            ],
          },
          select: { archiveId: true },
        })
      : Promise.resolve([]),
    saleIds.length > 0
      ? prisma.receipt.findMany({
          where: {
            saleId: { in: saleIds },
            documentArchiveId: { not: null },
          },
          select: { documentArchiveId: true },
        })
      : Promise.resolve([]),
    saleIds.length + refundIds.length + collectorReportIds.length > 0
      ? prisma.documentArchive.findMany({
          where: {
            OR: [
              ...(saleIds.length > 0
                ? [{ documentId: { in: saleIds } }]
                : []),
              ...(refundIds.length > 0
                ? [{ documentId: { in: refundIds } }]
                : []),
              ...(collectorReportIds.length > 0
                ? [{ documentId: { in: collectorReportIds } }]
                : []),
            ],
          },
          select: { id: true },
        })
      : Promise.resolve([]),
  ])

  const archiveIds = uniqueIds([
    ...links.map((l) => l.archiveId),
    ...receiptRows
      .map((r) => r.documentArchiveId)
      .filter((id): id is string => Boolean(id)),
    ...legacyArchives.map((a) => a.id),
  ])

  return {
    saleIds,
    refundIds,
    collectorReportIds,
    stockDocumentIds,
    voucherIds,
    archiveIds,
  }
}

type CountPrisma = {
  sale: {
    count: (args: unknown) => Promise<number>
  }
  refund: {
    count: (args: unknown) => Promise<number>
  }
  collectorReport: {
    count: (args: unknown) => Promise<number>
  }
  stockDocument: {
    count: (args: unknown) => Promise<number>
  }
  voucher: {
    count: (args: unknown) => Promise<number>
  }
  saleItem: { count: (args: unknown) => Promise<number> }
  payment: { count: (args: unknown) => Promise<number> }
  receipt: { count: (args: unknown) => Promise<number> }
  posPayInEvidence: { count: (args: unknown) => Promise<number> }
  stockTransaction: { count: (args: unknown) => Promise<number> }
  stockDocumentLine: { count: (args: unknown) => Promise<number> }
  voucherLine: { count: (args: unknown) => Promise<number> }
  journalEntry: { count: (args: unknown) => Promise<number> }
  journalEntryLine: { count: (args: unknown) => Promise<number> }
  documentArchiveLink: { count: (args: unknown) => Promise<number> }
  documentArchive: { count: (args: unknown) => Promise<number> }
  reconciliationSnapshot: { count: (args: unknown) => Promise<number> }
  workTimeEntry: { count: (args: unknown) => Promise<number> }
  documentCounter: { count: (args: unknown) => Promise<number> }
}

export async function countUatResetTargets(
  prisma: CountPrisma,
  scope: UatResetScopeIds,
  range: UatResetDateRange
): Promise<UatResetTableCounts> {
  const saleWhere = scope.saleIds.length
    ? { id: { in: scope.saleIds } }
    : { id: { in: [] as string[] } }
  const refundWhere = scope.refundIds.length
    ? { id: { in: scope.refundIds } }
    : { id: { in: [] as string[] } }
  const collectorWhere = scope.collectorReportIds.length
    ? { id: { in: scope.collectorReportIds } }
    : { id: { in: [] as string[] } }
  const stockDocWhere = scope.stockDocumentIds.length
    ? { id: { in: scope.stockDocumentIds } }
    : { id: { in: [] as string[] } }
  const voucherWhere = scope.voucherIds.length
    ? { id: { in: scope.voucherIds } }
    : { id: { in: [] as string[] } }
  const archiveWhere = scope.archiveIds.length
    ? { id: { in: scope.archiveIds } }
    : { id: { in: [] as string[] } }
  const stockTxWhere = buildStockTransactionDeleteWhere(scope, range)

  const [
    sale,
    saleItem,
    payment,
    receipt,
    receiptArchiveUnlink,
    refund,
    collectorReport,
    posPayInEvidence,
    stockTransaction,
    stockDocument,
    stockDocumentLine,
    voucher,
    voucherLine,
    journalEntry,
    journalEntryLine,
    documentArchiveLink,
    documentArchive,
    reconciliationSnapshot,
    workTimeEntry,
    documentCounter,
  ] = await Promise.all([
    prisma.sale.count({ where: saleWhere }),
    prisma.saleItem.count({ where: { saleId: { in: scope.saleIds } } }),
    prisma.payment.count({ where: { saleId: { in: scope.saleIds } } }),
    prisma.receipt.count({ where: { saleId: { in: scope.saleIds } } }),
    prisma.receipt.count({
      where: {
        saleId: { in: scope.saleIds },
        documentArchiveId: { not: null },
      },
    }),
    prisma.refund.count({ where: refundWhere }),
    prisma.collectorReport.count({ where: collectorWhere }),
    scope.collectorReportIds.length
      ? prisma.posPayInEvidence.count({
          where: { collectorReportId: { in: scope.collectorReportIds } },
        })
      : Promise.resolve(0),
    prisma.stockTransaction.count({ where: stockTxWhere }),
    prisma.stockDocument.count({ where: stockDocWhere }),
    prisma.stockDocumentLine.count({
      where: { documentId: { in: scope.stockDocumentIds } },
    }),
    prisma.voucher.count({ where: voucherWhere }),
    prisma.voucherLine.count({ where: { voucher: voucherWhere } }),
    prisma.journalEntry.count({ where: { voucher: voucherWhere } }),
    prisma.journalEntryLine.count({
      where: { journalEntry: { voucher: voucherWhere } },
    }),
    prisma.documentArchiveLink.count({ where: { archiveId: { in: scope.archiveIds } } }),
    prisma.documentArchive.count({ where: archiveWhere }),
    prisma.reconciliationSnapshot.count({
      where: reconciliationSnapshotScopeWhere(range),
    }),
    prisma.workTimeEntry.count({ where: { workDate: workDateRangeWhere(range) } }),
    prisma.documentCounter.count({ where: { period: range.periodCounter } }),
  ])

  return {
    sale,
    saleItem,
    payment,
    receipt,
    receiptArchiveUnlink,
    refund,
    collectorReport,
    posPayInEvidence,
    stockTransaction,
    stockDocument,
    stockDocumentLine,
    voucher,
    voucherLine,
    journalEntry,
    journalEntryLine,
    documentArchiveLink,
    documentArchive,
    reconciliationSnapshot,
    workTimeEntry,
    documentCounter,
  }
}

export async function countProtectedMasterData(
  prisma: {
    legalEntity: { count: () => Promise<number> }
    branch: { count: (args: unknown) => Promise<number> }
    staff: { count: (args: unknown) => Promise<number> }
    product: { count: (args: unknown) => Promise<number> }
    referenceStock: { count: () => Promise<number> }
    glAccount: { count: (args: unknown) => Promise<number> }
    accountingPeriod: { count: () => Promise<number> }
    pricingPolicy: { count: () => Promise<number> }
    sale: { count: (args: unknown) => Promise<number> }
  },
  range: UatResetDateRange
): Promise<ProtectedMasterCounts> {
  const [
    legalEntity,
    branch,
    staff,
    product,
    referenceStock,
    glAccount,
    accountingPeriod,
    pricingPolicy,
    baselineSaleBeforeRange,
  ] = await Promise.all([
    prisma.legalEntity.count(),
    prisma.branch.count({ where: { deleted: false } }),
    prisma.staff.count({ where: { deleted: false } }),
    prisma.product.count({ where: { deleted: false } }),
    prisma.referenceStock.count(),
    prisma.glAccount.count({ where: { deleted: false } }),
    prisma.accountingPeriod.count(),
    prisma.pricingPolicy.count(),
    prisma.sale.count({
      where: { createdAt: { lt: range.from } },
    }),
  ])

  return {
    legalEntity,
    branch,
    staff,
    product,
    referenceStock,
    glAccount,
    accountingPeriod,
    pricingPolicy,
    baselineSaleBeforeRange,
  }
}

type ResetTx = {
  posPayInEvidence: {
    updateMany: (args: unknown) => Promise<unknown>
    deleteMany: (args: unknown) => Promise<unknown>
  }
  journalEntry: { deleteMany: (args: unknown) => Promise<unknown> }
  voucher: { deleteMany: (args: unknown) => Promise<unknown> }
  documentArchiveLink: { deleteMany: (args: unknown) => Promise<unknown> }
  receipt: { updateMany: (args: unknown) => Promise<unknown> }
  documentArchive: { deleteMany: (args: unknown) => Promise<unknown> }
  collectorReport: { deleteMany: (args: unknown) => Promise<unknown> }
  refund: { deleteMany: (args: unknown) => Promise<unknown> }
  stockTransaction: { deleteMany: (args: unknown) => Promise<unknown> }
  stockDocument: { deleteMany: (args: unknown) => Promise<unknown> }
  sale: { deleteMany: (args: unknown) => Promise<unknown> }
  reconciliationSnapshot: { deleteMany: (args: unknown) => Promise<unknown> }
  workTimeEntry: { deleteMany: (args: unknown) => Promise<unknown> }
  documentCounter: { deleteMany: (args: unknown) => Promise<unknown> }
}

export async function executeUatReset(
  tx: ResetTx,
  scope: UatResetScopeIds,
  range: UatResetDateRange
): Promise<void> {
  const {
    voucherIds,
    archiveIds,
    saleIds,
    refundIds,
    collectorReportIds,
    stockDocumentIds,
  } = scope

  if (voucherIds.length > 0) {
    await tx.posPayInEvidence.updateMany({
      where: { bankDepositVoucherId: { in: voucherIds } },
      data: { bankDepositVoucherId: null },
    })

    await tx.journalEntry.deleteMany({
      where: {
        reversalOfJournalEntryId: { not: null },
        voucherId: { in: voucherIds },
      },
    })
    await tx.journalEntry.deleteMany({
      where: { voucherId: { in: voucherIds } },
    })
    await tx.voucher.deleteMany({ where: { id: { in: voucherIds } } })
  }

  if (archiveIds.length > 0) {
    await tx.documentArchiveLink.deleteMany({
      where: { archiveId: { in: archiveIds } },
    })
  }

  if (saleIds.length + refundIds.length + collectorReportIds.length > 0) {
    await tx.documentArchiveLink.deleteMany({
      where: {
        OR: [
          ...(saleIds.length > 0
            ? [{ documentKind: "REC" as const, documentId: { in: saleIds } }]
            : []),
          ...(refundIds.length > 0
            ? [{ documentKind: "REF" as const, documentId: { in: refundIds } }]
            : []),
          ...(collectorReportIds.length > 0
            ? [{ documentKind: "COL" as const, documentId: { in: collectorReportIds } }]
            : []),
        ],
      },
    })
  }

  if (saleIds.length > 0) {
    await tx.receipt.updateMany({
      where: {
        saleId: { in: saleIds },
        documentArchiveId: { not: null },
      },
      data: { documentArchiveId: null },
    })
  }

  if (archiveIds.length > 0) {
    await tx.documentArchive.deleteMany({ where: { id: { in: archiveIds } } })
  }

  if (collectorReportIds.length > 0) {
    await tx.posPayInEvidence.deleteMany({
      where: { collectorReportId: { in: collectorReportIds } },
    })
    await tx.collectorReport.deleteMany({
      where: { id: { in: collectorReportIds } },
    })
  }

  if (refundIds.length > 0) {
    await tx.refund.deleteMany({ where: { id: { in: refundIds } } })
  }

  await tx.stockTransaction.deleteMany({
    where: buildStockTransactionDeleteWhere(scope, range),
  })

  if (stockDocumentIds.length > 0) {
    await tx.stockDocument.deleteMany({
      where: { id: { in: stockDocumentIds } },
    })
  }

  if (saleIds.length > 0) {
    await tx.sale.deleteMany({ where: { id: { in: saleIds } } })
  }

  await tx.reconciliationSnapshot.deleteMany({
    where: reconciliationSnapshotScopeWhere(range),
  })
  await tx.workTimeEntry.deleteMany({
    where: { workDate: workDateRangeWhere(range) },
  })
  await tx.documentCounter.deleteMany({
    where: { period: range.periodCounter },
  })
}
