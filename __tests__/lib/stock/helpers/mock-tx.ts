import { Prisma } from "@/generated/prisma/client"
import type { Prisma as PrismaTypes } from "@/generated/prisma/client"

type StockRow = {
  id: string
  branchId: string
  productId: string
  qty: number
  avgCost: Prisma.Decimal
}

type LayerRow = {
  id: string
  branchId: string
  productId: string
  qty: number
  qtyRemain: number
  unitCost: Prisma.Decimal
  refType: string | null
  refId: string | null
  createdAt: Date
}

type TxRow = {
  id: string
  branchId: string
  productId: string
  date: Date
  qtyIn: number
  qtyOut: number
  unitCost: Prisma.Decimal
  beforeQty: number
  afterQty: number
  beforeValue: Prisma.Decimal
  afterValue: Prisma.Decimal
  refType: string
  refId: string
  refLineId: string
  documentId: string | null
}

let seq = 0
function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}`
}

export type MockTxState = {
  stocks: Map<string, StockRow>
  layers: LayerRow[]
  transactions: TxRow[]
}

export function createMockTx(initial?: Partial<MockTxState>) {
  const state: MockTxState = {
    stocks: initial?.stocks ?? new Map(),
    layers: initial?.layers ? [...initial.layers] : [],
    transactions: initial?.transactions ? [...initial.transactions] : [],
  }

  const stockKey = (branchId: string, productId: string) =>
    `${branchId}:${productId}`

  const tx: PrismaTypes.TransactionClient = {
    stock: {
      findUnique: async ({ where }: { where: { branchId_productId: { branchId: string; productId: string } } }) => {
        const key = stockKey(where.branchId_productId.branchId, where.branchId_productId.productId)
        return state.stocks.get(key) ?? null
      },
      create: async ({ data }: { data: { branchId: string; productId: string; qty: number; avgCost: Prisma.Decimal } }) => {
        const row: StockRow = {
          id: nextId("stock"),
          branchId: data.branchId,
          productId: data.productId,
          qty: data.qty,
          avgCost: data.avgCost,
        }
        state.stocks.set(stockKey(data.branchId, data.productId), row)
        return row
      },
      update: async ({
        where,
        data,
      }: {
        where: { branchId_productId: { branchId: string; productId: string } }
        data: { qty?: number; avgCost?: Prisma.Decimal }
      }) => {
        const key = stockKey(where.branchId_productId.branchId, where.branchId_productId.productId)
        const row = state.stocks.get(key)
        if (!row) throw new Error(`stock not found: ${key}`)
        if (data.qty !== undefined) row.qty = data.qty
        if (data.avgCost !== undefined) row.avgCost = data.avgCost
        return row
      },
    },
    stockLayer: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { branchId: string; productId: string; qtyRemain: { gt: number } }
        orderBy: { createdAt: "asc" | "desc" }
      }) => {
        let rows = state.layers.filter(
          (l) =>
            l.branchId === where.branchId &&
            l.productId === where.productId &&
            l.qtyRemain > where.qtyRemain.gt
        )
        if (orderBy.createdAt === "asc") {
          rows = rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        }
        return rows
      },
      create: async ({
        data,
      }: {
        data: {
          branchId: string
          productId: string
          qty: number
          qtyRemain: number
          unitCost: Prisma.Decimal
          refType?: string | null
          refId?: string | null
        }
      }) => {
        const row: LayerRow = {
          id: nextId("layer"),
          branchId: data.branchId,
          productId: data.productId,
          qty: data.qty,
          qtyRemain: data.qtyRemain,
          unitCost: data.unitCost,
          refType: data.refType ?? null,
          refId: data.refId ?? null,
          createdAt: new Date(),
        }
        state.layers.push(row)
        return row
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string }
        data: { qtyRemain: { decrement: number } }
      }) => {
        const row = state.layers.find((l) => l.id === where.id)
        if (!row) throw new Error(`layer not found: ${where.id}`)
        row.qtyRemain -= data.qtyRemain.decrement
        return row
      },
    },
    stockTransaction: {
      create: async ({ data }: { data: Omit<TxRow, "id"> }) => {
        const row: TxRow = { id: nextId("tx"), ...data }
        state.transactions.push(row)
        return row
      },
      findMany: async ({
        where,
      }: {
        where: {
          refType?: string
          refId?: string
          documentId?: string | null
        }
      }) => {
        return state.transactions.filter((t) => {
          if (where.refType !== undefined && t.refType !== where.refType) return false
          if (where.refId !== undefined && t.refId !== where.refId) return false
          if (where.documentId !== undefined && t.documentId !== where.documentId)
            return false
          return true
        })
      },
    },
  } as unknown as PrismaTypes.TransactionClient

  return { tx, state }
}