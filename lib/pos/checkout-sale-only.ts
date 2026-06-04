import { PaymentMethod, type Prisma } from "@/generated/prisma/client"
import { ledgerSkipReasonAtSale } from "@/lib/products/product-type-rules"
import { prisma } from "@/lib/shared/prisma"
import { CheckoutError } from "./checkout-errors"
import type { CheckoutInput, CheckoutResult } from "./checkout-types"
import { createPaymentRow } from "./payment"
import { allocateReceiptNo, createReceiptRow } from "./receipt"
import { validateAndPrepareCheckout } from "./validation"

const EMPTY_LEDGER = { applied: 0, skippedZeroQty: 0 }

/**
 * POS checkout without stock or finance posting — Sale, SaleItem, Payment, Receipt only.
 */
export async function checkoutWithoutPosting(
  input: CheckoutInput
): Promise<CheckoutResult> {
  if (input.paymentMethod !== PaymentMethod.CASH) {
    throw new CheckoutError(
      "Only CASH payment is supported in this phase",
      "PAYMENT_METHOD_NOT_ALLOWED",
      400
    )
  }

  const prepared = await validateAndPrepareCheckout(prisma, {
    ...input,
    paymentMethod: PaymentMethod.CASH,
  })

  const run = async (tx: Prisma.TransactionClient): Promise<CheckoutResult> => {
    const sale = await tx.sale.create({
      data: {
        branchId: prepared.branchId,
        staffId: prepared.staffId,
        total: prepared.total,
      },
    })

    const createdItems: CheckoutResult["items"] = []

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
      ledger: EMPTY_LEDGER,
    }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
