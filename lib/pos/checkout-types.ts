import type { Prisma, PaymentMethod, ProductType } from "@/generated/prisma/client"
import type { StockLedgerResult } from "@/lib/stock/transaction-types"

export type CheckoutCartLine = {
  productId: string
  qty: number
  unitPrice: number | string
}

export type CheckoutInput = {
  branchId: string
  staffId?: string | null
  paymentMethod: PaymentMethod
  paidAmount: number | string
  lines: CheckoutCartLine[]
  tx?: Prisma.TransactionClient
}

export type PreparedCheckoutLine = {
  productId: string
  productType: ProductType
  qty: number
  unitPrice: Prisma.Decimal
  lineTotal: Prisma.Decimal
}

export type PreparedCheckout = {
  branchId: string
  staffId: string | null
  paymentMethod: PaymentMethod
  paidAmount: Prisma.Decimal
  total: Prisma.Decimal
  change: Prisma.Decimal
  lines: PreparedCheckoutLine[]
}

export type CheckoutResult = {
  sale: {
    id: string
    branchId: string
    staffId: string | null
    total: Prisma.Decimal
    createdAt: Date
  }
  items: Array<{
    id: string
    productId: string
    productType: ProductType
    qty: number
    ledgerSkippedReason: string | null
  }>
  payment: {
    id: string
    method: PaymentMethod
    amount: Prisma.Decimal
    change: Prisma.Decimal
  }
  receipt: {
    id: string
    receiptNo: string
    issuedAt: Date
  }
  ledger: StockLedgerResult
}