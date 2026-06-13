import type { Prisma } from "@/generated/prisma/client"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"
import { DocumentError, DocumentErrorCodes } from "./document-errors"
import type { StockDocumentWithLines } from "./document-types"
import { periodMonthFromDate } from "./document-validation"
import { generateRunningRef } from "./generate-ref"

export type GetOrCreateShopOrderInput = {
  branchId: string
  staffId: string
  tx?: Prisma.TransactionClient
  /** Test hook — defaults to new Date(). */
  now?: Date
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
 * Find or create the single active shop ORDER (TRANSFER_OUT DRAFT) for a branch.
 * Does not mutate an existing draft (date/refNo preserved).
 * After submit/completion, the next call creates a new draft with the next running ref.
 */
export async function getOrCreateShopOrderDocument(
  input: GetOrCreateShopOrderInput
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

    const existingDraft = await tx.stockDocument.findFirst({
      where: {
        docType: "TRANSFER_OUT",
        branchId,
        status: "DRAFT",
      },
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    })

    if (existingDraft) {
      return existingDraft
    }

    const branch = await loadBranchOrThrow(tx, branchId)
    const refNo = await generateRunningRef(tx, "TRANSFER_OUT", now, branch.code)

    return tx.stockDocument.create({
      data: {
        refNo,
        docType: "TRANSFER_OUT",
        status: "DRAFT",
        date: now,
        branchId,
        legalEntityCode: DEFAULT_DOCUMENT_ENTITY_CODE,
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
