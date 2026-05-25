import type { Prisma } from "@/generated/prisma/client"

function formatYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}${m}${d}`
}

/** Business-facing receipt number — not an inventory or ledger identity. */
export async function allocateReceiptNo(
  tx: Prisma.TransactionClient,
  branchId: string,
  at: Date
): Promise<string> {
  const start = new Date(at)
  start.setHours(0, 0, 0, 0)
  const count = await tx.receipt.count({
    where: {
      branchId,
      issuedAt: { gte: start },
    },
  })
  const seq = String(count + 1).padStart(4, "0")
  return `R-${branchId.slice(0, 8)}-${formatYmd(at)}-${seq}`
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