import type { DocStatus, DocType, Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  deriveBusinessPhaseCode,
  type BusinessPhaseCode,
} from "@/lib/stock-ui/business-phase-title"
import type { StockDocumentInquiryKindFilter } from "./stock-document-inquiry-types"

const RECEIVE_STATUSES: readonly DocStatus[] = [
  "SHIPPED",
  "CONFIRMED",
  "RECEIVED",
  "POSTED",
  "TRANSFERRED",
]

const ORD_STATUSES: readonly DocStatus[] = ["DRAFT", "SUBMITTED"]

type KindRow = {
  docType: DocType
  status: DocStatus
  legalEntityCode: DocumentEntityCode
}

export function deriveStockDocumentInquiryPhaseCode(
  row: KindRow
): BusinessPhaseCode {
  return deriveBusinessPhaseCode({
    docType: row.docType,
    status: row.status,
    viewerEntityCode: row.legalEntityCode,
  })
}

export function matchesStockDocumentInquiryKindFilter(
  kind: StockDocumentInquiryKindFilter,
  status: "" | DocStatus,
  row: KindRow
): boolean {
  if (!kind) {
    return status ? row.status === status : true
  }

  const phase = deriveStockDocumentInquiryPhaseCode(row)
  if (phase !== kind) return false
  return status ? row.status === status : true
}

/**
 * Map UI kind + status to Prisma where clauses (session legal entity scoped).
 */
export function stockInquiryKindToWhere(
  kind: StockDocumentInquiryKindFilter,
  legalEntityCode: DocumentEntityCode,
  status?: DocStatus
): Prisma.StockDocumentWhereInput | undefined {
  if (!kind) return undefined

  switch (kind) {
    case "CNT":
      return {
        docType: "ADJUSTMENT",
        ...(status ? { status } : { status: "DRAFT" }),
      }
    case "ADJ":
      return {
        docType: "ADJUSTMENT",
        ...(status ? { status } : { status: { not: "DRAFT" } }),
      }
    case "ORS":
      return {
        docType: "PURCHASE",
        ...(status ? { status } : { status: "SHIPPED" }),
      }
    case "ORI":
      return {
        OR: [
          { docType: "TRANSFER_IN", ...(status ? { status } : {}) },
          {
            docType: "TRANSFER_OUT",
            status: status ?? { in: [...RECEIVE_STATUSES] },
          },
          {
            docType: "PURCHASE",
            status: status ?? {
              in: ["CONFIRMED", "RECEIVED", "POSTED", "TRANSFERRED"],
            },
          },
        ],
      }
    case "DEY":
      if (legalEntityCode !== "AD") {
        return { id: { in: [] } }
      }
      return {
        docType: "TRANSFER_OUT",
        status: status ?? { in: ["SUBMITTED", "SHIPPED"] },
      }
    case "ORD":
      return {
        OR: [
          {
            docType: "TRANSFER_OUT",
            status: status ?? { in: [...ORD_STATUSES] },
          },
          {
            docType: "PURCHASE",
            status: status ?? { in: [...ORD_STATUSES] },
          },
        ],
      }
    default:
      return undefined
  }
}
