import type { Prisma as PrismaTypes } from "@/generated/prisma/client"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { createMockTx, type MockTxState } from "../helpers/mock-tx"

export function createPostingMockTx(doc: StockDocumentWithLines) {
  let current: StockDocumentWithLines | null = structuredClone(
    doc
  ) as StockDocumentWithLines
  const { tx: baseTx, state } = createMockTx()

  const tx = {
    ...baseTx,
    stockDocument: {
      findUnique: async ({
        where,
        include,
        select,
      }: {
        where: { id: string }
        include?: { lines?: boolean }
        select?: Record<string, boolean>
      }) => {
        if (!current || where.id !== current.id) return null
        if (select) {
          const picked: Record<string, unknown> = { id: current.id }
          for (const key of Object.keys(select)) {
            if (select[key]) {
              picked[key] = (current as Record<string, unknown>)[key]
            }
          }
          return picked
        }
        if (include?.lines) return current
        return current
      },
      delete: async ({ where }: { where: { id: string } }) => {
        if (!current || where.id !== current.id) throw new Error("document not found")
        current = null
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
        if (!current || where.id !== current.id) throw new Error("document not found")
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

  return {
    tx,
    state,
    getDocument: () => {
      if (!current) throw new Error("document deleted")
      return current
    },
    restoreDocument: (doc: StockDocumentWithLines) => {
      current = structuredClone(doc) as StockDocumentWithLines
    },
  }
}

export type PostingMockTx = ReturnType<typeof createPostingMockTx>