import {
  RefundKind,
  SaleStatus,
  type Prisma,
} from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { toDec, ZERO } from "@/lib/stock/decimal"
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

function parseRequiredAmount(
  raw: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal {
  const dec = parseOptionalAmount(raw)
  if (dec === null) {
    throw new RefundError("Refund amount is required", "INVALID_REFUND_AMOUNT", 400)
  }
  return dec
}

function assertNonEmptyReason(reason: unknown): string {
  const s = String(reason ?? "").trim()
  if (!s) {
    throw new RefundError(
      "Reason is required for goodwill refunds",
      "GOODWILL_REASON_REQUIRED",
      400
    )
  }
  return s
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
  input: CreateRefundInput
): Promise<CreateRefundResult> {
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

async function createGoodwillRefund(
  db: RefundDb,
  input: CreateRefundInput
): Promise<CreateRefundResult> {
  const branchId = assertBranchId(input.branchId)
  const amount = parseRequiredAmount(input.amount)
  const reason = assertNonEmptyReason(input.reason)

  const row = await db.refund.create({
    data: {
      kind: RefundKind.GOODWILL,
      saleId: null,
      branchId,
      staffId: input.staffId?.trim() || null,
      originalReceiptId: null,
      amount,
      reason,
    },
  })

  return {
    id: row.id,
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

  const run = async (tx: Prisma.TransactionClient): Promise<CreateRefundResult> => {
    if (saleId) {
      return createSaleLinkedRefund(tx, { ...input, branchId, saleId })
    }
    return createGoodwillRefund(tx, { ...input, branchId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
