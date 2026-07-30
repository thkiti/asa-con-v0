import type { PrismaClient } from "@/generated/prisma/client"
import { DocumentError, DocumentErrorCodes } from "../document/document-errors"
import type { SessionUser } from "@/lib/auth/types"
import {
  assertCanReadDocument,
  resolveSessionLegalEntityCode,
} from "./document-access"
import type { StockDocumentDetailRead } from "./types"

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

export async function getStockDocumentDetail(
  prisma: PrismaClient,
  session: SessionUser,
  documentId: string
): Promise<StockDocumentDetailRead> {
  const id = String(documentId ?? "").trim()
  if (!id) {
    throw new DocumentError(
      "Document not found",
      DocumentErrorCodes.DOCUMENT_NOT_FOUND,
      404
    )
  }

  // Same legal-entity scope as list — never load by id alone.
  const legalEntityCode = resolveSessionLegalEntityCode(session)

  const doc = await prisma.stockDocument.findFirst({
    where: { id, legalEntityCode },
    include: {
      lines: {
        orderBy: { id: "asc" },
        include: {
          product: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  })

  if (!doc) {
    throw new DocumentError(
      "Document not found",
      DocumentErrorCodes.DOCUMENT_NOT_FOUND,
      404
    )
  }

  assertCanReadDocument(session, doc)

  return {
    id: doc.id,
    refNo: doc.refNo,
    docType: doc.docType,
    status: doc.status,
    date: doc.date.toISOString(),
    periodMonth: doc.periodMonth,
    branchId: doc.branchId,
    legalEntityCode: doc.legalEntityCode,
    fromLocId: doc.fromLocId,
    toLocId: doc.toLocId,
    submittedAt: toIso(doc.submittedAt),
    confirmedAt: toIso(doc.confirmedAt),
    postedAt: toIso(doc.postedAt),
    createdByStaffId: doc.createdByStaffId,
    confirmedByStaffId: doc.confirmedByStaffId,
    postedByStaffId: doc.postedByStaffId,
    cancelledAt: toIso(doc.cancelledAt),
    cancelledByStaffId: doc.cancelledByStaffId,
    cancelReason: doc.cancelReason,
    createdAt: doc.createdAt.toISOString(),
    lines: doc.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      qty: line.qty,
      endingQty: line.endingQty,
      reviewPostingDelta: line.reviewPostingDelta,
      product: {
        id: line.product.id,
        code: line.product.code,
        name: line.product.name,
      },
    })),
  }
}
