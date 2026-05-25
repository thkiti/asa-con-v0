import type { Prisma } from "@/generated/prisma/client"

/** Well-known refType classifiers (callers may use other strings). */
export const STOCK_REF_TYPES = {
  STOCK_DOC: "STOCK_DOC",
  POS_SALE: "POS_SALE",
  ADJUSTMENT: "ADJUSTMENT",
} as const

export type StockMoveItem = {
  productId: string
  /** Positive magnitude only — direction is chosen by issueStock vs receiveStock. */
  qty: number
  unitCost?: number
  lineId?: string
}

export type StockMoveContext = {
  branchId: string
  refType: string
  refId: string
  documentId?: string | null
  date?: Date
  tx?: Prisma.TransactionClient
}

export type IssueStockInput = StockMoveContext & {
  items: StockMoveItem[]
}

export type ReceiveStockInput = StockMoveContext & {
  items: StockMoveItem[]
}

export type StockLedgerResult = {
  applied: number
  skippedZeroQty: number
}

export type ApplyLineContext = {
  branchId: string
  refType: string
  refId: string
  documentId: string | null
  date: Date
}

export type ApplyLineResult = "applied" | "skipped"