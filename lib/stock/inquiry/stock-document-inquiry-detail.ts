import type { PrismaClient } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { toMoney, ZERO } from "@/lib/finance/decimal"
import { deriveStockDocumentInquiryPhaseCode } from "./stock-document-inquiry-kind-filter"
import {
  buildStockDocumentInquiryPrintPath,
  buildStockDocumentOperationalPath,
} from "./stock-document-inquiry-links"
import type {
  StockDocumentInquiryDetail,
  StockDocumentInquiryLineRow,
} from "./stock-document-inquiry-types"
import { STOCK_DOCUMENT_PHASE_THAI_LABELS } from "./stock-document-phase-labels"

export type StockDocumentInquiryDetailPrisma = Pick<
  PrismaClient,
  "stockDocument" | "staff" | "voucher" | "stockTransaction"
>

function formatMoney(value: number | string | null | undefined): string | null {
  if (value == null) return null
  return toMoney(value).toFixed(2)
}

function buildLineNote(input: {
  endingQty: number | null
  reviewPostingDelta: number | null
}): string | null {
  const parts: string[] = []
  if (input.endingQty != null) {
    parts.push(`End ${input.endingQty}`)
  }
  if (input.reviewPostingDelta != null && input.reviewPostingDelta !== 0) {
    parts.push(`Δ ${input.reviewPostingDelta}`)
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

function sumLineQty(lines: Array<{ qty: number }>): number {
  return lines.reduce((sum, line) => sum + line.qty, 0)
}

function sumLineAmount(lines: StockDocumentInquiryLineRow[]): string | null {
  let total = ZERO
  let hasAmount = false
  for (const line of lines) {
    if (line.amount == null) continue
    total = total.plus(toMoney(line.amount))
    hasAmount = true
  }
  return hasAmount ? total.toFixed(2) : null
}

export async function getStockDocumentInquiryDetail(
  prisma: StockDocumentInquiryDetailPrisma,
  documentId: string,
  legalEntityCode: DocumentEntityCode
): Promise<StockDocumentInquiryDetail | null> {
  const doc = await prisma.stockDocument.findFirst({
    where: { id: documentId, legalEntityCode },
    include: {
      branch: { select: { code: true, name: true } },
      lines: {
        orderBy: { id: "asc" },
        include: {
          product: { select: { code: true, name: true } },
        },
      },
      transactions: {
        select: {
          refLineId: true,
          unitCost: true,
          qtyIn: true,
          qtyOut: true,
        },
      },
    },
  })

  if (!doc) return null

  const costByLineId = new Map<string, string>()
  for (const tx of doc.transactions) {
    const qty = tx.qtyIn > 0 ? tx.qtyIn : tx.qtyOut
    if (qty <= 0) continue
    costByLineId.set(tx.refLineId, toMoney(tx.unitCost).toFixed(6))
  }

  const lines: StockDocumentInquiryLineRow[] = doc.lines.map((line) => {
    const unitCost = costByLineId.get(line.id) ?? null
    const amount =
      unitCost != null ? toMoney(unitCost).mul(Math.abs(line.qty)).toFixed(2) : null

    return {
      id: line.id,
      productCode: line.product.code,
      description: line.product.name,
      qty: line.qty,
      unitCost,
      amount,
      note: buildLineNote({
        endingQty: line.endingQty,
        reviewPostingDelta: line.reviewPostingDelta,
      }),
    }
  })

  const staffIds = [
    doc.createdByStaffId,
    doc.confirmedByStaffId,
    doc.postedByStaffId,
  ].filter((value): value is string => Boolean(value?.trim()))

  const staffRows =
    staffIds.length > 0
      ? await prisma.staff.findMany({
          where: { staffId: { in: [...new Set(staffIds)] } },
          select: { staffId: true, name: true },
        })
      : []

  const staffById = new Map(staffRows.map((row) => [row.staffId, row.name]))
  const primaryStaffId = doc.postedByStaffId ?? doc.confirmedByStaffId ?? doc.createdByStaffId

  const voucher = await prisma.voucher.findFirst({
    where: {
      legalEntityCode,
      refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
      refId: doc.id,
    },
    select: {
      id: true,
      journalEntry: { select: { id: true } },
    },
  })

  const entityCode = doc.legalEntityCode as DocumentEntityCode
  const phaseCode = deriveStockDocumentInquiryPhaseCode({
    docType: doc.docType,
    status: doc.status,
    legalEntityCode: entityCode,
  })

  const posted = doc.status === "POSTED" || doc.status === "TRANSFERRED"

  return {
    id: doc.id,
    legalEntityCode: doc.legalEntityCode,
    phaseCode,
    phaseLabelTh: STOCK_DOCUMENT_PHASE_THAI_LABELS[phaseCode],
    documentNo: doc.refNo,
    date: doc.date.toISOString(),
    branchId: doc.branchId,
    branchCode: doc.branch.code,
    branchName: doc.branch.name,
    staffId: primaryStaffId,
    staffName: primaryStaffId ? staffById.get(primaryStaffId) ?? null : null,
    status: doc.status,
    posted,
    pdfAvailable: null,
    printPath: buildStockDocumentInquiryPrintPath(doc.id),
    voucherId: voucher?.id ?? null,
    journalEntryId: voucher?.journalEntry?.id ?? null,
    stockMovementPath: buildStockDocumentOperationalPath(doc.id),
    createdAt: doc.createdAt.toISOString(),
    submittedAt: doc.submittedAt?.toISOString() ?? null,
    confirmedAt: doc.confirmedAt?.toISOString() ?? null,
    postedAt: doc.postedAt?.toISOString() ?? null,
    totalQty: sumLineQty(lines),
    totalAmount: sumLineAmount(lines),
    lines,
  }
}
