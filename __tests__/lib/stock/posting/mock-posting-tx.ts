import type { Prisma as PrismaTypes } from "@/generated/prisma/client"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { createMockTx, type MockTxState } from "../helpers/mock-tx"

export function createPostingMockTx(doc: StockDocumentWithLines) {
  let current = structuredClone(doc) as StockDocumentWithLines
  const { tx: baseTx, state } = createMockTx()

  const tx = {
    ...baseTx,
    stockDocument: {
      findUnique: async ({
        where,
        include,
      }: {
        where: { id: string }
        include?: { lines?: boolean }
      }) => {
        if (where.id !== current.id) return null
        if (include?.lines) return current
        return current
      },
      update: async ({
        where,
        data,
        include,
      }: {
        where: { id: string }
        data: Partial<StockDocumentWithLines>
        include?: { lines?: boolean }
      }) => {
        if (where.id !== current.id) throw new Error("document not found")
        current = {
          ...current,
          ...data,
          lines: current.lines,
        } as StockDocumentWithLines
        if (include?.lines) return current
        return current
      },
    },
  } as unknown as PrismaTypes.TransactionClient

  return { tx, state, getDocument: () => current, restoreDocument: (doc: StockDocumentWithLines) => {
    current = structuredClone(doc) as StockDocumentWithLines
  } }
}

export type PostingMockTx = ReturnType<typeof createPostingMockTx>