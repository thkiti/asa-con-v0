import type { Prisma } from "@/generated/prisma/client"
import { CheckoutError } from "./checkout-errors"

export function receiptMonthBounds(at: Date): { start: Date; endExclusive: Date } {
  return {
    start: new Date(at.getFullYear(), at.getMonth(), 1),
    endExclusive: new Date(at.getFullYear(), at.getMonth() + 1, 1),
  }
}

export function formatReceiptYearMonth(at: Date): string {
  const y = at.getFullYear()
  const m = String(at.getMonth() + 1).padStart(2, "0")
  return `${y}${m}`
}

/** REC-{BranchCode}-{YYYYMM}-{Seq4} e.g. REC-SH001-202606-0001 */
export function buildReceiptNo(
  branchCode: string,
  at: Date,
  sequence: number
): string {
  const code = String(branchCode ?? "").trim()
  const seq = String(sequence).padStart(4, "0")
  return `REC-${code}-${formatReceiptYearMonth(at)}-${seq}`
}

type ReceiptCountDb = Pick<Prisma.TransactionClient, "receipt">

export async function countReceiptsInMonth(
  db: ReceiptCountDb,
  branchId: string,
  at: Date
): Promise<number> {
  const { start, endExclusive } = receiptMonthBounds(at)
  return db.receipt.count({
    where: {
      branchId,
      issuedAt: { gte: start, lt: endExclusive },
    },
  })
}

/**
 * Read-only next receipt number for POS display — does not create a Receipt row.
 * Same sequence rule as {@link allocateReceiptNo} (count + 1 for current month).
 */
export async function previewNextReceiptNo(
  db: Pick<Prisma.TransactionClient, "branch" | "receipt">,
  branchId: string,
  at: Date = new Date()
): Promise<string> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  })
  if (!branch?.code?.trim()) {
    throw new CheckoutError("Branch not found for receipt", "INVALID_BRANCH", 400)
  }

  const count = await countReceiptsInMonth(db, branchId, at)
  return buildReceiptNo(branch.code, at, count + 1)
}

/**
 * Business-facing receipt number — not an inventory or ledger identity.
 * Monthly sequence per branch (resets each calendar month).
 */
export async function allocateReceiptNo(
  tx: Prisma.TransactionClient,
  branchId: string,
  at: Date
): Promise<string> {
  const branch = await tx.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  })
  if (!branch?.code?.trim()) {
    throw new CheckoutError("Branch not found for receipt", "INVALID_BRANCH", 400)
  }

  const count = await countReceiptsInMonth(tx, branchId, at)
  return buildReceiptNo(branch.code, at, count + 1)
}

export async function createReceiptRow(
  tx: Prisma.TransactionClient,
  args: {
    saleId: string
    branchId: string
    receiptNo: string
    issuedAt: Date
  }
) {
  return tx.receipt.create({
    data: {
      saleId: args.saleId,
      branchId: args.branchId,
      receiptNo: args.receiptNo,
      issuedAt: args.issuedAt,
    },
  })
}
