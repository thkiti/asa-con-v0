import type { Prisma } from "@/generated/prisma/client"
import { formatReceiptYearMonth, receiptMonthBounds } from "./receipt"
import { RefundError } from "./refund-errors"

/** REF-{BranchCode}-{YYYYMM}-{Seq4} e.g. REF-SH001-202606-0001 */
export function buildRefundNo(
  branchCode: string,
  at: Date,
  sequence: number
): string {
  const code = String(branchCode ?? "").trim().toUpperCase()
  const seq = String(sequence).padStart(4, "0")
  return `REF-${code}-${formatReceiptYearMonth(at)}-${seq}`
}

type RefundCountDb = Pick<Prisma.TransactionClient, "refund">

export async function countRefundsInMonth(
  db: RefundCountDb,
  branchId: string,
  at: Date
): Promise<number> {
  const { start, endExclusive } = receiptMonthBounds(at)
  return db.refund.count({
    where: {
      branchId,
      createdAt: { gte: start, lt: endExclusive },
    },
  })
}

/**
 * Business-facing refund document number — not an inventory or ledger identity.
 * Monthly sequence per branch (resets each calendar month).
 */
export async function allocateRefundNo(
  tx: Pick<Prisma.TransactionClient, "branch" | "refund">,
  branchId: string,
  at: Date = new Date()
): Promise<string> {
  const branch = await tx.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  })
  if (!branch?.code?.trim()) {
    throw new RefundError("Branch not found for refund", "MISSING_BRANCH", 400)
  }

  const count = await countRefundsInMonth(tx, branchId, at)
  return buildRefundNo(branch.code, at, count + 1)
}
