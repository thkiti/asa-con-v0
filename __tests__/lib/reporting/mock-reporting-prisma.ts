import { Prisma, ProductType } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"

export type MockReportingState = {
  stocks: Array<{
    branchId: string
    productId: string
    qty: number
    avgCost: Prisma.Decimal
    product: {
      code: string
      name: string
      productType: ProductType
      deleted: boolean
    }
    branch: { name: string }
  }>
  stockLayers: Array<{
    branchId: string
    productId: string
    qtyRemain: number
    unitCost: Prisma.Decimal
    createdAt: Date
    product: { productType: ProductType; deleted: boolean }
  }>
  stockTransactions: Array<Record<string, unknown>>
  sales: Array<Record<string, unknown>>
}

export function createEmptyMockReportingState(): MockReportingState {
  return {
    stocks: [],
    stockLayers: [],
    stockTransactions: [],
    sales: [],
  }
}

export function createMockReportingPrisma(state: MockReportingState) {
  const client = {
    stock: {
      findMany: jest.fn(async ({ where, include }: { where?: Record<string, unknown>; include?: unknown }) => {
        void include
        let rows = [...state.stocks]
        if (where?.branchId) rows = rows.filter((r) => r.branchId === where.branchId)
        if (where?.productId) rows = rows.filter((r) => r.productId === where.productId)
        if (where?.qty && typeof where.qty === "object" && (where.qty as { not?: number }).not === 0) {
          rows = rows.filter((r) => r.qty !== 0)
        }
        return rows
      }),
    },
    stockLayer: {
      findMany: jest.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let rows = state.stockLayers.filter((l) => l.qtyRemain > 0)
        if (where?.branchId) rows = rows.filter((r) => r.branchId === where.branchId)
        if (where?.productId) rows = rows.filter((r) => r.productId === where.productId)
        return rows
      }),
    },
    stockTransaction: {
      findMany: jest.fn(async () => state.stockTransactions),
    },
    sale: {
      findMany: jest.fn(async () => state.sales),
    },
  }

  return client as unknown as Pick<
    PrismaClient,
    "stock" | "stockLayer" | "stockTransaction" | "sale"
  >
}
