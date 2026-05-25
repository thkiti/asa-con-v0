import type { Prisma, StockDocument, StockDocumentLine } from "@/generated/prisma/client"
import type { StockLedgerResult, StockMoveItem } from "./transaction-types"

export type StockDocumentWithLines = StockDocument & {
  lines: StockDocumentLine[]
}

export type PostDocumentInput = {
  documentId: string
  postedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type PostDocumentResult = {
  document: StockDocumentWithLines
  ledger: {
    issue: StockLedgerResult
    receive: StockLedgerResult
  }
}

export type MappedLedgerMoves = {
  branchId: string
  refType: string
  inbound: StockMoveItem[]
  outbound: StockMoveItem[]
}