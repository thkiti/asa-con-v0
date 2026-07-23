import type { Prisma } from "@/generated/prisma/client"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"
import {
  assertDocTypeAllowedForEntity,
  assertStockDocumentEntityBranchScope,
} from "@/lib/stock/document-read/stock-document-entity-scope"
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

  const legalEntityCode =
    parseDocumentEntityCode(input.legalEntityCode) ?? DEFAULT_DOCUMENT_ENTITY_CODE

  assertDocTypeAllowedForEntity(legalEntityCode, docType)

  const run = async (tx: Prisma.TransactionClient): Promise<StockDocumentWithLines> => {
    await assertStockDocumentEntityBranchScope(tx, {
      legalEntityCode,
      branchId,
      forEnd: false,
    })
    await assertTransferRoute(tx, docType, input.fromLocId, input.toLocId)

    // DEY ownership: ASAD TRANSFER_OUT must leave HO (fromLoc = HO), destination is toLoc only.
    if (legalEntityCode === "AD" && docType === "TRANSFER_OUT") {
      const fromId = String(input.fromLocId ?? "").trim()
      if (fromId && fromId !== branchId) {
        throw new DocumentError(
          "ASAD DEY must ship from HO999 (fromLoc must match document Location)",
          DocumentErrorCodes.INVALID_TRANSFER_ROUTE,
          400
        )
      }
    }

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

      if (existing.shopReceivedAt) {
        throw new DocumentError(
          "Document confirmed as shop-received cannot be edited; use controlled correction",
          DocumentErrorCodes.DOCUMENT_IMMUTABLE,
          409
        )
      }

      if (existing.docType === "END") {
        throw new DocumentError(
          "END documents cannot be saved via generic stock document save",
          DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
          400
        )
      }

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
        legalEntityCode,
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
