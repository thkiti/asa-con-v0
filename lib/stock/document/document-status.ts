import type { Prisma } from "@/generated/prisma/client"
import { DocumentError } from "./document-errors"
import {
  assertTransitionAllowed,
  resolveVoidAction,
} from "./document-transition-policy"
import type {
  ApplyCancelledTransitionInput,
  ApplyPostedTransitionInput,
  DeleteDraftDocumentInput,
  StockDocumentWithLines,
} from "./document-types"

async function loadDocumentWithLines(
  tx: Prisma.TransactionClient,
  documentId: string
): Promise<StockDocumentWithLines | null> {
  return tx.stockDocument.findUnique({
    where: { id: documentId },
    include: { lines: true },
  })
}

/**
 * Sole module allowed to mutate StockDocument.status, workflow timestamps, or delete documents.
 */
export async function applyPostedTransition(
  tx: Prisma.TransactionClient,
  input: ApplyPostedTransitionInput
): Promise<StockDocumentWithLines> {
  const doc = await loadDocumentWithLines(tx, input.documentId)
  if (!doc) {
    throw new DocumentError("Document not found", "NOT_FOUND", 404)
  }

  assertTransitionAllowed({
    docType: doc.docType,
    fromStatus: input.priorStatus,
    action: "POST",
  })

  const now = new Date()
  const implicitConfirm =
    input.priorStatus === "SUBMITTED" && input.confirmedAt == null
      ? {
          confirmedByStaffId: input.confirmedByStaffId ?? input.postedByStaffId,
          confirmedAt: now,
        }
      : {}

  return tx.stockDocument.update({
    where: { id: input.documentId },
    data: {
      status: "POSTED",
      postedByStaffId: input.postedByStaffId,
      postedAt: now,
      ...implicitConfirm,
    },
    include: { lines: true },
  })
}

export async function applyCancelledTransition(
  tx: Prisma.TransactionClient,
  input: ApplyCancelledTransitionInput
): Promise<StockDocumentWithLines> {
  const doc = await loadDocumentWithLines(tx, input.documentId)
  if (!doc) {
    throw new DocumentError("Document not found", "NOT_FOUND", 404)
  }

  if (resolveVoidAction(doc.status) !== "CANCEL") {
    throw new DocumentError(
      `Cannot cancel document in status ${doc.status}`,
      "IMMUTABLE_DOCUMENT",
      400
    )
  }

  assertTransitionAllowed({
    docType: doc.docType,
    fromStatus: doc.status,
    action: "CANCEL",
  })

  const now = new Date()
  return tx.stockDocument.update({
    where: { id: input.documentId },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancelledByStaffId: input.cancelledByStaffId,
      cancelReason: input.cancelReason ?? null,
    },
    include: { lines: true },
  })
}

export async function deleteDraftDocument(
  tx: Prisma.TransactionClient,
  input: DeleteDraftDocumentInput
): Promise<void> {
  const doc = await tx.stockDocument.findUnique({
    where: { id: input.documentId },
    select: { id: true, status: true, docType: true },
  })

  if (!doc) {
    throw new DocumentError("Document not found", "NOT_FOUND", 404)
  }

  if (resolveVoidAction(doc.status) !== "DELETE") {
    throw new DocumentError(
      `Only DRAFT documents may be deleted (status: ${doc.status})`,
      "IMMUTABLE_DOCUMENT",
      400
    )
  }

  assertTransitionAllowed({
    docType: doc.docType,
    fromStatus: doc.status,
    action: "DELETE_DRAFT",
  })

  await tx.stockDocument.delete({ where: { id: input.documentId } })
}
