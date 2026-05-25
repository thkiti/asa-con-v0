import { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import type {
  MovementReportFilter,
  MovementReportResult,
  MovementReportRow,
} from "@/lib/reporting/report-types"
import { toDec } from "./decimal"

export type MovementReportPrisma = Pick<PrismaClient, "stockTransaction">

export async function getMovementReport(
  prisma: MovementReportPrisma,
  filter: MovementReportFilter = {}
): Promise<MovementReportResult> {
  const where: Prisma.StockTransactionWhereInput = {}

  if (filter.branchId) where.branchId = filter.branchId
  if (filter.productId) where.productId = filter.productId
  if (filter.refType) where.refType = filter.refType
  if (filter.docType) {
    where.document = { docType: filter.docType }
  }
  if (filter.from != null && filter.to != null) {
    const range = normalizeDateRange({ from: filter.from, to: filter.to })
    where.date = { gte: range.start, lt: range.endExclusive }
  }

  const transactions = await prisma.stockTransaction.findMany({
    where,
    include: {
      document: { select: { docType: true } },
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  })

  let qtyIn = 0
  let qtyOut = 0

  const rows: MovementReportRow[] = transactions.map((tx) => {
    qtyIn += tx.qtyIn
    qtyOut += tx.qtyOut
    return {
      id: tx.id,
      branchId: tx.branchId,
      productId: tx.productId,
      date: tx.date,
      qtyIn: tx.qtyIn,
      qtyOut: tx.qtyOut,
      unitCost: toDec(tx.unitCost).toString(),
      refType: tx.refType,
      refId: tx.refId,
      refLineId: tx.refLineId,
      documentId: tx.documentId,
      docType: tx.document?.docType ?? null,
    }
  })

  return {
    rows,
    totals: { qtyIn, qtyOut },
  }
}
