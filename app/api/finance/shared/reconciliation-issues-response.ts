import type { PrismaClient } from "@/generated/prisma/client"
import type { ReconciliationIssue } from "@/lib/finance/reconciliation-types"
import { runFinanceReconciliation } from "@/lib/finance/reconciliation"
import {
  deriveIssueStatus,
  filterIssueRows,
  type ReconciliationIssueJournalRef,
  type ReconciliationIssueRow,
  type ReconciliationIssuesFilter,
  type ReconciliationIssuesResult,
  type ReconciliationIssueVoucherRef,
} from "@/lib/finance-ui/reconciliation-issues"

type VoucherRow = {
  id: string
  voucherNo: string
  refType: string
  refId: string
  postedAt: Date | null
  journalEntry: { id: string; postedAt: Date } | null
}

export async function buildReconciliationIssuesResult(
  prisma: PrismaClient,
  filter: ReconciliationIssuesFilter
): Promise<ReconciliationIssuesResult> {
  const summary = await runFinanceReconciliation(prisma, {
    branchId: filter.branchId,
    fromDate: filter.from ? new Date(filter.from) : undefined,
    toDate: filter.to ? new Date(filter.to) : undefined,
  })

  const sourceIds = [...new Set(summary.issues.map((issue) => issue.sourceId))]
  const saleIds = summary.issues
    .filter((issue) => issue.sourceType === "SALE")
    .map((issue) => issue.sourceId)
  const documentIds = summary.issues
    .filter((issue) => issue.sourceType === "STOCK_DOCUMENT")
    .map((issue) => issue.sourceId)

  const [vouchers, sales, stockDocuments] = await Promise.all([
    sourceIds.length > 0
      ? prisma.voucher.findMany({
          where: { refId: { in: sourceIds } },
          select: {
            id: true,
            voucherNo: true,
            refType: true,
            refId: true,
            postedAt: true,
            journalEntry: {
              select: {
                id: true,
                postedAt: true,
              },
            },
          },
        })
      : Promise.resolve([] as VoucherRow[]),
    saleIds.length > 0
      ? prisma.sale.findMany({
          where: { id: { in: saleIds } },
          select: { id: true, createdAt: true },
        })
      : Promise.resolve([] as Array<{ id: string; createdAt: Date }>),
    documentIds.length > 0
      ? prisma.stockDocument.findMany({
          where: { id: { in: documentIds } },
          select: { id: true, refNo: true, postedAt: true },
        })
      : Promise.resolve(
          [] as Array<{ id: string; refNo: string; postedAt: Date | null }>
        ),
  ])

  const vouchersByRef = new Map<string, VoucherRow[]>()
  for (const voucher of vouchers) {
    const existing = vouchersByRef.get(voucher.refId) ?? []
    existing.push(voucher)
    vouchersByRef.set(voucher.refId, existing)
  }

  const saleById = new Map(sales.map((sale) => [sale.id, sale]))
  const docById = new Map(stockDocuments.map((doc) => [doc.id, doc]))

  const rows = summary.issues.map((issue) =>
    toIssueRow(issue, vouchersByRef.get(issue.sourceId) ?? [], saleById, docById)
  )

  const filtered = filterIssueRows(rows, filter)

  return {
    filter,
    checkedSales: summary.checkedSales,
    checkedStockDocuments: summary.checkedStockDocuments,
    issueCount: filtered.length,
    issues: filtered,
  }
}

function toIssueRow(
  issue: ReconciliationIssue,
  vouchers: VoucherRow[],
  saleById: Map<string, { id: string; createdAt: Date }>,
  docById: Map<string, { id: string; refNo: string; postedAt: Date | null }>
): ReconciliationIssueRow {
  const voucherRefs: ReconciliationIssueVoucherRef[] = vouchers.map((voucher) => ({
    id: voucher.id,
    voucherNo: voucher.voucherNo,
    refType: voucher.refType,
    refId: voucher.refId,
    postedAt: voucher.postedAt?.toISOString() ?? null,
  }))

  const journalEntries: ReconciliationIssueJournalRef[] = vouchers.flatMap(
    (voucher) =>
      voucher.journalEntry
        ? [
            {
              id: voucher.journalEntry.id,
              voucherId: voucher.id,
              postedAt: voucher.journalEntry.postedAt.toISOString(),
            },
          ]
        : []
  )

  const sale = issue.sourceType === "SALE" ? saleById.get(issue.sourceId) : undefined
  const doc =
    issue.sourceType === "STOCK_DOCUMENT"
      ? docById.get(issue.sourceId)
      : undefined

  return {
    id: issue.id,
    sourceType: issue.sourceType,
    sourceId: issue.sourceId,
    documentRef:
      issue.sourceType === "STOCK_DOCUMENT"
        ? (doc?.refNo ?? issue.sourceId)
        : issue.sourceId,
    issueType: issue.issueType,
    severity: issue.severity,
    status: deriveIssueStatus(issue),
    message: issue.message,
    expectedAmount: issue.expectedAmount ?? null,
    actualAmount: issue.actualAmount ?? null,
    difference: issue.difference ?? null,
    vouchers: voucherRefs,
    journalEntries,
    sourceCreatedAt: sale?.createdAt.toISOString() ?? null,
    sourcePostedAt: doc?.postedAt?.toISOString() ?? null,
  }
}
