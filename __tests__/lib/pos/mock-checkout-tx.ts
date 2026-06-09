import { Prisma } from "@/generated/prisma/client"
import type { Prisma as PrismaTypes } from "@/generated/prisma/client"
import type { PaymentMethod, ProductType } from "@/generated/prisma/client"
import { createMockTx, type MockTxState } from "../stock/helpers/mock-tx"

type SaleRow = {
  id: string
  branchId: string
  staffId: string | null
  total: Prisma.Decimal
  createdAt: Date
}

type SaleItemRow = {
  id: string
  saleId: string
  productId: string
  productType: ProductType
  qty: number
  unitPrice: Prisma.Decimal
  lineTotal: Prisma.Decimal
  ledgerSkippedReason: string | null
}

type PaymentRow = {
  id: string
  saleId: string
  method: PaymentMethod
  amount: Prisma.Decimal
  change: Prisma.Decimal
}

type ReceiptRow = {
  id: string
  saleId: string
  branchId: string
  receiptNo: string
  issuedAt: Date
}

type PaymentEvidenceRow = {
  id: string
  branchId: string
  receiptNo: string
  receiptId: string
  saleId: string
  paymentId: string
  status: string
}

let seq = 0
function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}`
}

export type CheckoutMockState = MockTxState & {
  sales: SaleRow[]
  saleItems: SaleItemRow[]
  payments: PaymentRow[]
  receipts: ReceiptRow[]
  paymentEvidences: PaymentEvidenceRow[]
}

export function createCheckoutMockTx(initial?: Partial<MockTxState>) {
  seq = 0
  const { tx: baseTx, state: baseState } = createMockTx(initial)
  const state: CheckoutMockState = {
    ...baseState,
    sales: [],
    saleItems: [],
    payments: [],
    receipts: [],
    paymentEvidences: [],
  }

  const tx = {
    ...baseTx,
    branch: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id) {
          return { code: "SH001" }
        }
        return null
      },
    },
    sale: {
      create: async ({
        data,
      }: {
        data: {
          branchId: string
          staffId: string | null
          total: Prisma.Decimal
        }
      }) => {
        const row: SaleRow = {
          id: nextId("sale"),
          branchId: data.branchId,
          staffId: data.staffId,
          total: data.total,
          createdAt: new Date("2026-01-15T10:00:00.000Z"),
        }
        state.sales.push(row)
        return row
      },
    },
    saleItem: {
      create: async ({
        data,
      }: {
        data: {
          saleId: string
          productId: string
          productType: ProductType
          qty: number
          unitPrice: Prisma.Decimal
          lineTotal: Prisma.Decimal
          ledgerSkippedReason: string | null
        }
      }) => {
        const row: SaleItemRow = {
          id: nextId("item"),
          ...data,
        }
        state.saleItems.push(row)
        return row
      },
    },
    payment: {
      create: async ({
        data,
      }: {
        data: {
          saleId: string
          method: PaymentMethod
          amount: Prisma.Decimal
          change: Prisma.Decimal
        }
      }) => {
        const row: PaymentRow = { id: nextId("pay"), ...data }
        state.payments.push(row)
        return row
      },
    },
    receipt: {
      count: async ({
        where,
      }: {
        where: {
          branchId: string
          issuedAt: { gte: Date; lt?: Date }
        }
      }) => {
        return state.receipts.filter((r) => {
          if (r.branchId !== where.branchId) return false
          if (where.issuedAt.gte && r.issuedAt.getTime() < where.issuedAt.gte.getTime()) {
            return false
          }
          if (where.issuedAt.lt && r.issuedAt.getTime() >= where.issuedAt.lt.getTime()) {
            return false
          }
          return true
        }).length
      },
      create: async ({
        data,
      }: {
        data: {
          saleId: string
          branchId: string
          receiptNo: string
          issuedAt: Date
        }
      }) => {
        const row: ReceiptRow = { id: nextId("rcpt"), ...data }
        state.receipts.push(row)
        return row
      },
    },
    paymentEvidence: {
      create: async ({
        data,
      }: {
        data: {
          branchId: string
          receiptNo: string
          receiptId: string
          saleId: string
          paymentId: string
          status: string
        }
      }) => {
        const row: PaymentEvidenceRow = { id: nextId("evidence"), ...data }
        state.paymentEvidences.push(row)
        return row
      },
    },
  } as unknown as PrismaTypes.TransactionClient

  return { tx, state }
}