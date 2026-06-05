import {
  RefundKind,
  SaleStatus,
  type Prisma,
} from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { toDec, ZERO } from "@/lib/stock/decimal"
import { allocateRefundNo } from "./refund-receipt-no"
import { RefundError } from "./refund-errors"

export type CreateRefundInput = {
  saleId?: string | null
  branchId: string
  staffId?: string | null
  amount?: number | string | Prisma.Decimal | null
  reason?: string | null
  tx?: Prisma.TransactionClient
}

export type CreateRefundResult = {
  id: string
  refundNo: string
  kind: RefundKind
  saleId: string | null
  branchId: string
  staffId: string | null
  originalReceiptId: string | null
  amount: Prisma.Decimal
  reason: string | null
  createdAt: Date
}

export type RefundPreviewResult = {
  saleId: string
  saleTotal: string
  refundedTotal: string
  remainingRefundable: string
  originalReceiptId: string | null
  originalReceiptNo: string | null
}

type RefundDb = Pick<
  Prisma.TransactionClient,
  "sale" | "refund"
>

type RefundCreateInput = CreateRefundInput & { refundNo: string }

function assertBranchId(branchId: unknown): string {
  const s = String(branchId ?? "").trim()
  if (!s) {
    throw new RefundError("branchId is required", "MISSING_BRANCH", 400)
  }
  return s
}

function parseOptionalAmount(
  raw: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === "string" && raw.trim() === "") return null
  const dec = toDec(raw)
  if (dec.lte(ZERO)) {
    throw new RefundError(
      "Refund amount must be greater than zero",
      "INVALID_REFUND_AMOUNT",
      400
    )
  }
  return dec
}

function assertReceiptRequiredForRefund(): never {
  throw new RefundError(
    "Original receipt is required for refund",
    "RECEIPT_REQUIRED_FOR_REFUND",
    400
  )
}

async function sumRefundedForSale(
  db: RefundDb,
  saleId: string
): Promise<Prisma.Decimal> {
  const agg = await db.refund.aggregate({
    where: { saleId },
    _sum: { amount: true },
  })
  return toDec(agg._sum.amount)
}

export async function getRefundPreview(
  db: RefundDb,
  input: { saleId: string; branchId: string }
): Promise<RefundPreviewResult> {
  const saleId = String(input.saleId ?? "").trim()
  const branchId = assertBranchId(input.branchId)
  if (!saleId) {
    throw new RefundError("saleId is required", "SALE_NOT_FOUND", 404)
  }

  const sale = await db.sale.findFirst({
    where: { id: saleId, branchId, status: SaleStatus.COMPLETED },
    include: { receipt: true },
  })
  if (!sale) {
    throw new RefundError("Sale not found", "SALE_NOT_FOUND", 404)
  }
  if (!sale.receipt) {
    assertReceiptRequiredForRefund()
  }

  const refundedTotal = await sumRefundedForSale(db, saleId)
  const remaining = toDec(sale.total).minus(refundedTotal)

  return {
    saleId: sale.id,
    saleTotal: toDec(sale.total).toFixed(2),
    refundedTotal: refundedTotal.toFixed(2),
    remainingRefundable: remaining.gt(ZERO) ? remaining.toFixed(2) : ZERO.toFixed(2),
    originalReceiptId: sale.receipt?.id ?? null,
    originalReceiptNo: sale.receipt?.receiptNo ?? null,
  }
}

async function createSaleLinkedRefund(
  db: RefundDb,
  input: RefundCreateInput
): Promise<CreateRefundResult> {
  const saleId = String(input.saleId ?? "").trim()
  const branchId = assertBranchId(input.branchId)
  if (!saleId) {
    assertReceiptRequiredForRefund()
  }

  const sale = await db.sale.findFirst({
    where: { id: saleId, branchId, status: SaleStatus.COMPLETED },
    include: { receipt: true },
  })
  if (!sale) {
    throw new RefundError("Sale not found", "SALE_NOT_FOUND", 404)
  }
  if (!sale.receipt) {
    assertReceiptRequiredForRefund()
  }

  const alreadyRefunded = await sumRefundedForSale(db, saleId)
  const saleTotal = toDec(sale.total)
  const remaining = saleTotal.minus(alreadyRefunded)

  if (remaining.lte(ZERO)) {
    throw new RefundError(
      "Sale is already fully refunded",
      "ALREADY_FULLY_REFUNDED",
      400
    )
  }

  const explicitAmount = parseOptionalAmount(input.amount)
  const amount = explicitAmount ?? remaining

  if (amount.gt(remaining)) {
    throw new RefundError(
      "Refund amount exceeds remaining refundable balance",
      "OVER_REFUND",
      400
    )
  }

  const reason =
    input.reason != null && String(input.reason).trim() !== ""
      ? String(input.reason).trim()
      : null

  const row = await db.refund.create({
    data: {
      refundNo: input.refundNo,
      kind: RefundKind.SALE_LINKED,
      saleId: sale.id,
      branchId,
      staffId: input.staffId?.trim() || null,
      originalReceiptId: sale.receipt?.id ?? null,
      amount,
      reason,
    },
  })

  return {
    id: row.id,
    refundNo: row.refundNo,
    kind: row.kind,
    saleId: row.saleId,
    branchId: row.branchId,
    staffId: row.staffId,
    originalReceiptId: row.originalReceiptId,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.createdAt,
  }
}

export async function createRefund(
  input: CreateRefundInput
): Promise<CreateRefundResult> {
  const branchId = assertBranchId(input.branchId)
  const saleId = input.saleId != null ? String(input.saleId).trim() : ""
  if (!saleId) {
    assertReceiptRequiredForRefund()
  }

  const run = async (tx: Prisma.TransactionClient): Promise<CreateRefundResult> => {
    const at = new Date()
    const refundNo = await allocateRefundNo(tx, branchId, at)
    return createSaleLinkedRefund(tx, { ...input, branchId, saleId, refundNo })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
