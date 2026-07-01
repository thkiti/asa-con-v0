import type { Prisma } from "@/generated/prisma/client"
import { createPendingPaymentEvidenceRow, requiresPaymentEvidence } from "./payment-evidence"
import { isFinancePostingEnabled } from "@/lib/finance/config"
import { postSaleVoucher } from "@/lib/finance/posting"
import { prisma } from "@/lib/shared/prisma"
import {
  ledgerSkipReasonAtSale,
  participatesInLedgerAtSale,
} from "@/lib/products/product-type-rules"
import { issueStock } from "@/lib/stock/ledger"
import { STOCK_REF_TYPES } from "@/lib/stock/transaction-types"
import type { StockMoveItem } from "@/lib/stock/transaction-types"
import { CheckoutError } from "./checkout-errors"
import type { CheckoutInput, CheckoutResult } from "./checkout-types"
import { createPaymentRow } from "./payment"
import { allocateReceiptNo, createReceiptRow } from "./receipt"
import { buildPostSaleVoucherInput } from "./checkout-finance"
import {
  resolvePosLegalEntityCode,
  resolvePosSaleVatEconomics,
  saleVatSnapshotFields,
} from "./resolve-pos-sale-vat"
import { validateAndPrepareCheckout } from "./validation"

const EMPTY_LEDGER = { applied: 0, skippedZeroQty: 0 }

/**
 * POS checkout orchestrator — only module that atomically creates
 * Sale, SaleItem, Payment, Receipt and calls issueStock().
 */
export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const prepared = await validateAndPrepareCheckout(prisma, input)

  const run = async (tx: Prisma.TransactionClient): Promise<CheckoutResult> => {
    const documentDate = new Date()
    const vatEconomics = await resolvePosSaleVatEconomics(tx, {
      documentDate,
      grossTotal: prepared.total,
    })

    const sale = await tx.sale.create({
      data: {
        branchId: prepared.branchId,
        staffId: prepared.staffId,
        total: prepared.total,
        ...saleVatSnapshotFields(vatEconomics),
        createdAt: documentDate,
      },
    })

    const createdItems: CheckoutResult["items"] = []
    const issueItems: StockMoveItem[] = []

    for (const line of prepared.lines) {
      const skipReason = ledgerSkipReasonAtSale(line.productType)
      const item = await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: line.productId,
          productType: line.productType,
          qty: line.qty,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          ledgerSkippedReason: skipReason,
        },
      })

      createdItems.push({
        id: item.id,
        productId: item.productId,
        productType: item.productType,
        qty: item.qty,
        ledgerSkippedReason: item.ledgerSkippedReason,
      })

      if (participatesInLedgerAtSale(line.productType)) {
        issueItems.push({
          productId: line.productId,
          qty: line.qty,
          lineId: item.id,
        })
      } else if (skipReason === null) {
        throw new CheckoutError(
          `Missing ledger skip reason for non-tracked product ${line.productId}`,
          "MISSING_SKIP_REASON",
          500
        )
      }
    }

    let ledgerResult = EMPTY_LEDGER
    if (issueItems.length > 0) {
      ledgerResult = await issueStock({
        tx,
        branchId: prepared.branchId,
        items: issueItems,
        refType: STOCK_REF_TYPES.POS_SALE,
        refId: sale.id,
        documentId: null,
        date: sale.createdAt,
      })
    }

    const payment = await createPaymentRow(tx, {
      saleId: sale.id,
      method: prepared.paymentMethod,
      amount: prepared.paidAmount,
      change: prepared.change,
    })

    const receiptNo = await allocateReceiptNo(tx, prepared.branchId, sale.createdAt)
    const receipt = await createReceiptRow(tx, {
      saleId: sale.id,
      branchId: prepared.branchId,
      receiptNo,
      issuedAt: sale.createdAt,
    })

    if (requiresPaymentEvidence(prepared.paymentMethod)) {
      await createPendingPaymentEvidenceRow(tx, {
        branchId: prepared.branchId,
        receiptNo: receipt.receiptNo,
        receiptId: receipt.id,
        saleId: sale.id,
        paymentId: payment.id,
      })
    }

    if (isFinancePostingEnabled()) {
      const ledgerRows = await tx.stockTransaction.findMany({
        where: {
          refType: STOCK_REF_TYPES.POS_SALE,
          refId: sale.id,
        },
      })
      await postSaleVoucher(
        buildPostSaleVoucherInput({
          tx,
          receiptNo: receipt.receiptNo,
          sale,
          payment,
          ledgerRows,
          legalEntityCode: resolvePosLegalEntityCode(),
          vatEconomics,
        })
      )
    }

    return {
      sale: {
        id: sale.id,
        branchId: sale.branchId,
        staffId: sale.staffId,
        total: sale.total,
        createdAt: sale.createdAt,
      },
      items: createdItems,
      payment: {
        id: payment.id,
        method: payment.method,
        amount: payment.amount,
        change: payment.change,
      },
      receipt: {
        id: receipt.id,
        receiptNo: receipt.receiptNo,
        issuedAt: receipt.issuedAt,
      },
      ledger: ledgerResult,
    }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}