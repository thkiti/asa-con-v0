import type { DocStatus, Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { DocumentError, DocumentErrorCodes } from "./document-errors"
import type { StockDocumentWithLines } from "./document-types"
import { periodMonthFromDate } from "./document-validation"
import { generateRunningRef } from "./generate-ref"

const BLOCKING_STATUSES: readonly DocStatus[] = [
  "SUBMITTED",
  "SHIPPED",
  "CONFIRMED",
  "RECEIVED",
  "POSTED",
  "TRANSFERRED",
]

export type GetOrCreateStockCountInput = {
  branchId: string
  staffId: string
  tx?: Prisma.TransactionClient
  /** Test hook — defaults to new Date(). */
  now?: Date
}

function stockCountPeriodWhere(branchId: string, periodMonth: string) {
  return {
    docType: "ADJUSTMENT" as const,
    branchId,
    fromLocId: branchId,
    periodMonth,
  }
}

async function loadBranchOrThrow(
  tx: Prisma.TransactionClient,
  branchId: string
): Promise<{ id: string; code: string }> {
  const branch = await tx.branch.findUnique({
    where: { id: branchId },
    select: { id: true, code: true, isActive: true, deleted: true },
  })

  if (!branch || branch.deleted || !branch.isActive) {
    throw new DocumentError(
      "Branch not found",
      DocumentErrorCodes.DOCUMENT_NOT_FOUND,
      404
    )
  }

  return { id: branch.id, code: branch.code }
}

/**
 * Find or create the shared shop stock-count ADJUSTMENT draft for branch + month.
 * Does not mutate an existing draft (date/refNo preserved).
 */
export async function getOrCreateStockCountDocument(
  input: GetOrCreateStockCountInput
): Promise<StockDocumentWithLines> {
  const branchId = String(input.branchId ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()
  if (!branchId) {
    throw new DocumentError(
      "branchId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }
  if (!staffId) {
    throw new DocumentError(
      "staffId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<StockDocumentWithLines> => {
    const now = input.now ?? new Date()
    const periodMonth = periodMonthFromDate(now)
    const baseWhere = stockCountPeriodWhere(branchId, periodMonth)

    const existingDraft = await tx.stockDocument.findFirst({
      where: {
        ...baseWhere,
        status: "DRAFT",
      },
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    })

    if (existingDraft) {
      return existingDraft
    }

    const blocking = await tx.stockDocument.findFirst({
      where: {
        ...baseWhere,
        status: { in: [...BLOCKING_STATUSES] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, refNo: true, status: true },
    })

    if (blocking) {
      throw new DocumentError(
        `Stock count for this branch and month is already ${blocking.status} (${blocking.refNo})`,
        DocumentErrorCodes.STOCK_COUNT_ALREADY_SUBMITTED,
        409
      )
    }

    const branch = await loadBranchOrThrow(tx, branchId)
    const refNo = await generateRunningRef(tx, "ADJUSTMENT", now, branch.code)

    return tx.stockDocument.create({
      data: {
        refNo,
        docType: "ADJUSTMENT",
        status: "DRAFT",
        date: now,
        branchId,
        fromLocId: branchId,
        toLocId: null,
        periodMonth,
        createdByStaffId: staffId,
      },
      include: { lines: true },
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
