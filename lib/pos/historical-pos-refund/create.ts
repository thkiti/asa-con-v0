import {
  PaymentMethod,
  RefundKind,
  type Prisma,
} from "@/generated/prisma/client"
import { postRefundVoucher } from "@/lib/finance/posting"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { resolvePosLegalEntityCode } from "@/lib/pos/resolve-pos-sale-vat"
import {
  LEGACY_HISTORICAL_REFUND_REASON,
  LEGACY_HISTORICAL_REFUND_REASON_CODE,
} from "./constants"
import { buildStableHistoricalRefundNo } from "./source"
import type { HistoricalRefundDocument } from "./types"

/**
 * Create an unlinked LEGACY_HISTORICAL Refund + LegacyRefundReference.
 * Does not touch live createRefund() sale-linked validation.
 */
export async function createLegacyHistoricalRefund(
  tx: Prisma.TransactionClient,
  doc: HistoricalRefundDocument
): Promise<{
  refundId: string
  refundNo: string
  alreadyImported: boolean
}> {
  if (!doc.branchId) {
    throw new Error(`Missing branch for ${doc.key}`)
  }

  const existingRef = await tx.legacyRefundReference.findUnique({
    where: {
      sourceFileName_legacyBranchId_legacyRefundDate_legacyTransNo: {
        sourceFileName: doc.sourceFileName,
        legacyBranchId: doc.legacyBranchId,
        legacyRefundDate: doc.legacyRefundDate,
        legacyTransNo: doc.legacyTransNo,
      },
    },
    select: { refundId: true, refund: { select: { refundNo: true } } },
  })

  if (existingRef) {
    return {
      refundId: existingRef.refundId,
      refundNo: existingRef.refund.refundNo,
      alreadyImported: true,
    }
  }

  const refundNo = buildStableHistoricalRefundNo({
    branchCode: doc.branchCode,
    legacyRefundDate: doc.legacyRefundDate,
    legacyTransNo: doc.legacyTransNo,
  })

  const refund = await tx.refund.create({
    data: {
      refundNo,
      kind: RefundKind.LEGACY_HISTORICAL,
      saleId: null,
      branchId: doc.branchId,
      staffId: doc.staffId,
      originalReceiptId: null,
      amount: doc.gross,
      reasonCode: LEGACY_HISTORICAL_REFUND_REASON_CODE,
      reason: LEGACY_HISTORICAL_REFUND_REASON,
      createdAt: doc.refundAt,
    },
  })

  await tx.legacyRefundReference.create({
    data: {
      refundId: refund.id,
      sourceFileName: doc.sourceFileName,
      legacyTransNo: doc.legacyTransNo,
      legacyBranchId: doc.legacyBranchId,
      legacyRefundDate: doc.legacyRefundDate,
      legacyRefundTime: doc.legacyRefundTime || null,
      sourceRowCount: doc.sourceRowCount,
      grossAmount: doc.gross,
      netAmount: doc.net,
      vatAmount: doc.vat,
    },
  })

  return { refundId: refund.id, refundNo: refund.refundNo, alreadyImported: false }
}

/**
 * Post money-only POS_REFUND using line-level VAT economics and CASH tender.
 */
export async function postLegacyHistoricalRefundVoucher(
  tx: Prisma.TransactionClient,
  input: {
    refundId: string
    refundNo: string
    branchId: string
    refundAt: Date
    gross: Prisma.Decimal
    vatEconomics: HistoricalRefundDocument["vatEconomics"]
  }
) {
  return postRefundVoucher({
    tx,
    legalEntityCode: resolvePosLegalEntityCode(),
    refund: {
      id: input.refundId,
      branchId: input.branchId,
      refundNo: input.refundNo,
      amount: input.gross,
      createdAt: input.refundAt,
    },
    paymentMethod: PaymentMethod.CASH,
    vatEconomics: input.vatEconomics,
  })
}

export { FINANCE_REF_TYPES }
