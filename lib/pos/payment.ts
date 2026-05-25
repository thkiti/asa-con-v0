import { PaymentMethod, type Prisma } from "@/generated/prisma/client"
import { toDec, ZERO } from "@/lib/stock/decimal"
import { CheckoutError } from "./checkout-errors"

export function computePaymentChange(
  total: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
  method: PaymentMethod
): Prisma.Decimal {
  if (paidAmount.lt(total)) {
    throw new CheckoutError(
      "Paid amount is less than sale total",
      "INSUFFICIENT_PAYMENT",
      400
    )
  }

  const change = paidAmount.minus(total)

  if (method !== PaymentMethod.CASH && !change.eq(ZERO)) {
    throw new CheckoutError(
      "Non-cash payments must match sale total exactly",
      "INVALID_PAYMENT_AMOUNT",
      400
    )
  }

  return change
}

export async function createPaymentRow(
  tx: Prisma.TransactionClient,
  args: {
    saleId: string
    method: PaymentMethod
    amount: Prisma.Decimal
    change: Prisma.Decimal
  }
) {
  return tx.payment.create({
    data: {
      saleId: args.saleId,
      method: args.method,
      amount: args.amount,
      change: args.change,
    },
  })
}

export function parsePaidAmount(raw: unknown): Prisma.Decimal {
  return toDec(raw as number | string)
}