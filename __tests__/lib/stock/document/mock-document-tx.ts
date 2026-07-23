import type { BranchType, Prisma as PrismaTypes } from "@/generated/prisma/client"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { createMockTx, type MockTxState } from "../helpers/mock-tx"

type BranchRow = {
  id: string
  code?: string
  type: BranchType
  isActive: boolean
  deleted: boolean
}

let lineSeq = 0
function nextLineId() {
  lineSeq += 1
  return `line-${lineSeq}`
}

export function createDocumentMockTx(
  initialDoc?: StockDocumentWithLines,
  branches: BranchRow[] = []
) {
  let current: StockDocumentWithLines | null = initialDoc
    ? (structuredClone(initialDoc) as StockDocumentWithLines)
    : null

  const branchById = new Map(branches.map((b) => [b.id, b]))
  const { tx: ledgerTx, state } = createMockTx()

  const tx = {
    ...ledgerTx,
    branch: {
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string }
        select?: Record<string, boolean>
      }) => {
        const row = branchById.get(where.id)
        if (!row) return null
        const enriched = {
          ...row,
          code:
            row.code ??
            (row.type === "HO" ? "HO999" : row.id.replace("branch-", "SH").toUpperCase()),
        }
        if (!select) return enriched
        const picked: Record<string, unknown> = {}
        for (const key of Object.keys(select)) {
          if (select[key]) picked[key] = (enriched as Record<string, unknown>)[key]
        }
        return picked
      },
    },
    stockDocument: {
      findUnique: async ({
        where,
        include,
      }: {
        where: { id: string }
        include?: { lines?: boolean }
      }) => {
        if (!current || where.id !== current.id) return null
        if (include?.lines) return current
        return current
      },
      create: async ({
        data,
        include,
      }: {
        data: {
          refNo: string
          docType: StockDocumentWithLines["docType"]
          status: StockDocumentWithLines["status"]
          date: Date
          branchId: string
          periodMonth?: string | null
          fromLocId?: string | null
          toLocId?: string | null
          createdByStaffId?: string | null
          lines?: {
            create: Array<{
              productId: string
              qty: number
              endingQty?: number | null
              reviewPostingDelta?: number | null
            }>
          }
        }
        include?: { lines?: boolean }
      }) => {
        const id = `doc-${Date.now()}`
        const lines =
          data.lines?.create.map((l) => ({
            id: nextLineId(),
            documentId: id,
            productId: l.productId,
            qty: l.qty,
            endingQty: l.endingQty ?? null,
            reviewPostingDelta: l.reviewPostingDelta ?? null,
          })) ?? []

        current = {
          id,
          refNo: data.refNo,
          docType: data.docType,
          status: data.status,
          date: data.date,
          branchId: data.branchId,
          periodMonth: data.periodMonth ?? null,
          fromLocId: data.fromLocId ?? null,
          toLocId: data.toLocId ?? null,
          submittedAt: null,
          confirmedAt: null,
          postedAt: null,
          createdByStaffId: data.createdByStaffId ?? null,
          confirmedByStaffId: null,
          postedByStaffId: null,
          cancelledAt: null,
          cancelledByStaffId: null,
          cancelReason: null,
          createdAt: new Date(),
          lines,
        }
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
    stockDocumentLine: {
      deleteMany: async ({ where }: { where: { documentId: string } }) => {
        if (!current || where.documentId !== current.id) return { count: 0 }
        const count = current.lines.length
        current = { ...current, lines: [] }
        return { count }
      },
      createMany: async ({
        data,
      }: {
        data: Array<{
          documentId: string
          productId: string
          qty: number
          endingQty?: number | null
          reviewPostingDelta?: number | null
        }>
      }) => {
        if (!current) throw new Error("no document")
        const newLines = data.map((l) => ({
          id: nextLineId(),
          documentId: l.documentId,
          productId: l.productId,
          qty: l.qty,
          endingQty: l.endingQty ?? null,
          reviewPostingDelta: l.reviewPostingDelta ?? null,
        }))
        current = { ...current, lines: [...current.lines, ...newLines] }
        return { count: data.length }
      },
    },
  } as unknown as PrismaTypes.TransactionClient

  return {
    tx,
    state: state as MockTxState,
    getDocument: () => {
      if (!current) throw new Error("no document")
      return current
    },
    setDocument: (doc: StockDocumentWithLines) => {
      current = structuredClone(doc) as StockDocumentWithLines
    },
  }
}
