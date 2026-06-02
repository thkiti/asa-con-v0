import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { DocumentError, DocumentErrorCodes } from "./document-errors"
import {
  applyCancelledTransition,
  applyConfirmedTransition,
  applySubmittedTransition,
  deleteDraftDocument as deleteDraftDocumentStatus,
} from "./document-status"
import type {
  CancelDocumentInput,
  ConfirmDocumentInput,
  DeleteDraftDocumentOrchestratorInput,
  StockDocumentWithLines,
  SubmitDocumentInput,
} from "./document-types"
import { assertCanSubmit } from "./document-validation"
import { isImmutableStatus } from "./document-transition-policy"

async function loadDocumentOrThrow(
  tx: Prisma.TransactionClient,
  documentId: string
): Promise<StockDocumentWithLines> {
  const doc = await tx.stockDocument.findUnique({
    where: { id: documentId },
    include: { lines: true },
  })

  if (!doc) {
    throw new DocumentError(
      "Document not found",
      DocumentErrorCodes.DOCUMENT_NOT_FOUND,
      404
    )
  }

  return doc
}

function assertNotImmutable(doc: StockDocumentWithLines, action: string): void {
  if (isImmutableStatus(doc.status)) {
    throw new DocumentError(
      `Cannot ${action} document in status ${doc.status}`,
      DocumentErrorCodes.DOCUMENT_IMMUTABLE
    )
  }
}

/**
 * DRAFT → SUBMITTED. No ledger or finance side effects.
 */
export async function submitDocument(
  input: SubmitDocumentInput
): Promise<StockDocumentWithLines> {
  const documentId = String(input.documentId ?? "").trim()
  if (!documentId) {
    throw new DocumentError(
      "documentId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<StockDocumentWithLines> => {
    const doc = await loadDocumentOrThrow(tx, documentId)
    assertNotImmutable(doc, "submit")
    assertCanSubmit(doc)
    return applySubmittedTransition(tx, { documentId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

/**
 * SUBMITTED → CONFIRMED. No ledger or finance side effects.
 */
export async function confirmDocument(
  input: ConfirmDocumentInput
): Promise<StockDocumentWithLines> {
  const documentId = String(input.documentId ?? "").trim()
  const confirmedByStaffId = String(input.confirmedByStaffId ?? "").trim()

  if (!documentId) {
    throw new DocumentError(
      "documentId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }
  if (!confirmedByStaffId) {
    throw new DocumentError(
      "confirmedByStaffId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<StockDocumentWithLines> => {
    const doc = await loadDocumentOrThrow(tx, documentId)
    assertNotImmutable(doc, "confirm")

    if (doc.status !== "SUBMITTED") {
      throw new DocumentError(
        `Only SUBMITTED documents may be confirmed (status: ${doc.status})`,
        DocumentErrorCodes.INVALID_DOCUMENT_STATUS
      )
    }

    return applyConfirmedTransition(tx, { documentId, confirmedByStaffId })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

/**
 * Pre-posted workflow statuses → CANCELLED. No ledger or finance side effects.
 */
export async function cancelDocument(
  input: CancelDocumentInput
): Promise<StockDocumentWithLines> {
  const documentId = String(input.documentId ?? "").trim()
  const cancelledByStaffId = String(input.cancelledByStaffId ?? "").trim()

  if (!documentId) {
    throw new DocumentError(
      "documentId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }
  if (!cancelledByStaffId) {
    throw new DocumentError(
      "cancelledByStaffId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<StockDocumentWithLines> =>
    applyCancelledTransition(tx, {
      documentId,
      cancelledByStaffId,
      cancelReason: input.cancelReason,
    })

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

/**
 * Hard-delete DRAFT only. Delegates to document-status.ts.
 */
export async function deleteDraftDocument(
  input: DeleteDraftDocumentOrchestratorInput
): Promise<void> {
  const documentId = String(input.documentId ?? "").trim()
  if (!documentId) {
    throw new DocumentError(
      "documentId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<void> =>
    deleteDraftDocumentStatus(tx, { documentId })

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
