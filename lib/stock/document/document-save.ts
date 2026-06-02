import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { DocumentError, DocumentErrorCodes } from "./document-errors"
import type { SaveDocumentInput, StockDocumentWithLines } from "./document-types"
import {
  assertDraftEditable,
  assertNonEmptyLines,
  assertTransferRoute,
  buildSaveLines,
  periodMonthFromDate,
} from "./document-validation"

function parseDate(value: Date | string): Date {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new DocumentError("Invalid document date", DocumentErrorCodes.INVALID_DOCUMENT_STATUS)
  }
  return d
}

function draftRefNo(docType: string): string {
  const suffix = Math.random().toString(36).slice(2, 10)
  return `${docType}-${Date.now()}-${suffix}`
}

function lineCreateData(lines: ReturnType<typeof buildSaveLines>) {
  return lines.map((line) => ({
    productId: line.productId,
    qty: line.qty,
    endingQty: line.endingQty ?? null,
    reviewPostingDelta: line.reviewPostingDelta ?? null,
  }))
}

async function replaceDocumentLines(
  tx: Prisma.TransactionClient,
  documentId: string,
  lines: ReturnType<typeof buildSaveLines>
): Promise<void> {
  await tx.stockDocumentLine.deleteMany({ where: { documentId } })
  if (lines.length > 0) {
    await tx.stockDocumentLine.createMany({
      data: lines.map((line) => ({
        documentId,
        productId: line.productId,
        qty: line.qty,
        endingQty: line.endingQty ?? null,
        reviewPostingDelta: line.reviewPostingDelta ?? null,
      })),
    })
  }
}

/**
 * Persist a DRAFT stock document and lines. Never mutates status or ledger.
 */
export async function saveDocument(
  input: SaveDocumentInput
): Promise<StockDocumentWithLines> {
  const docType = input.docType
  const docDate = parseDate(input.date)
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new DocumentError(
      "branchId is required",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }

  const sanitizedLines = buildSaveLines(input.lines, docType)
  assertNonEmptyLines(sanitizedLines)

  const run = async (tx: Prisma.TransactionClient): Promise<StockDocumentWithLines> => {
    await assertTransferRoute(tx, docType, input.fromLocId, input.toLocId)

    const headerData = {
      date: docDate,
      periodMonth: periodMonthFromDate(docDate),
      fromLocId: input.fromLocId ?? null,
      toLocId: input.toLocId ?? null,
    }

    const documentId = String(input.id ?? "").trim()

    if (documentId) {
      const existing = await tx.stockDocument.findUnique({
        where: { id: documentId },
        include: { lines: true },
      })

      if (!existing) {
        throw new DocumentError(
          "Document not found",
          DocumentErrorCodes.DOCUMENT_NOT_FOUND,
          404
        )
      }

      assertDraftEditable(existing)

      if (existing.docType !== docType) {
        throw new DocumentError(
          "docType cannot change on save",
          DocumentErrorCodes.INVALID_DOCUMENT_STATUS
        )
      }

      await tx.stockDocument.update({
        where: { id: documentId },
        data: headerData,
      })

      await replaceDocumentLines(tx, documentId, sanitizedLines)

      const updated = await tx.stockDocument.findUnique({
        where: { id: documentId },
        include: { lines: true },
      })

      if (!updated) {
        throw new DocumentError(
          "Document not found",
          DocumentErrorCodes.DOCUMENT_NOT_FOUND,
          404
        )
      }

      return updated
    }

    const created = await tx.stockDocument.create({
      data: {
        refNo: draftRefNo(docType),
        docType,
        status: "DRAFT",
        branchId,
        createdByStaffId: input.createdByStaffId ?? null,
        ...headerData,
        lines: {
          create: lineCreateData(sanitizedLines),
        },
      },
      include: { lines: true },
    })

    return created
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
