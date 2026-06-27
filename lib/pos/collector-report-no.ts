import type { Prisma } from "@/generated/prisma/client"
import { formatReceiptYearMonth, receiptMonthBounds } from "./receipt"

/** COL-{BranchCode}-{YYYYMM}-{Seq4} e.g. COL-SH001-202606-0003 */
export function buildCollectNo(
  branchCode: string,
  at: Date,
  sequence: number
): string {
  const code = String(branchCode ?? "").trim().toUpperCase()
  const seq = String(sequence).padStart(4, "0")
  return `COL-${code}-${formatReceiptYearMonth(at)}-${seq}`
}

type CollectorCountDb = Pick<Prisma.TransactionClient, "collectorReport">

export async function countCollectorReportsInMonth(
  db: CollectorCountDb,
  branchId: string,
  at: Date
): Promise<number> {
  const { start, endExclusive } = receiptMonthBounds(at)
  return db.collectorReport.count({
    where: {
      branchId,
      createdAt: { gte: start, lt: endExclusive },
    },
  })
}

/**
 * Business-facing collector document number — monthly sequence per branch.
 */
export async function allocateCollectNo(
  tx: Pick<Prisma.TransactionClient, "branch" | "collectorReport">,
  branchId: string,
  at: Date = new Date()
): Promise<string> {
  const branch = await tx.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  })
  if (!branch?.code?.trim()) {
    throw new Error("Branch not found for collector report")
  }

  const count = await countCollectorReportsInMonth(tx, branchId, at)
  return buildCollectNo(branch.code, at, count + 1)
}
