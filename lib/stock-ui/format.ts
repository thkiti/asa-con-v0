import type { DocStatus, DocType } from "@/generated/prisma/client"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  formatStockDocumentPhaseTitle,
  formatBusinessDocumentNumber,
  usesBusinessPhaseTitle,
} from "./business-phase-title"
import { SHOP_STOCK_DOC_TYPE_LABELS } from "./constants"

const STATUS_LABELS: Record<DocStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  SHIPPED: "Shipped",
  CONFIRMED: "Confirmed",
  RECEIVED: "Received",
  POSTED: "Posted",
  TRANSFERRED: "Transferred",
  CANCELLED: "Cancelled",
}

const STATUS_TONE: Record<DocStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  CONFIRMED: "bg-cyan-100 text-cyan-800",
  RECEIVED: "bg-teal-100 text-teal-800",
  POSTED: "bg-green-100 text-green-800",
  TRANSFERRED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export function formatDocTypeLabel(docType: DocType): string {
  if (docType in SHOP_STOCK_DOC_TYPE_LABELS) {
    return SHOP_STOCK_DOC_TYPE_LABELS[
      docType as keyof typeof SHOP_STOCK_DOC_TYPE_LABELS
    ]
  }
  return docType.replace(/_/g, " ")
}

/** Staff-facing title: business phase when mapped, else legacy type label. */
export function formatStaffFacingDocumentTitle(
  docType: DocType,
  status: DocStatus,
  viewerEntityCode: DocumentEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE
): string {
  if (usesBusinessPhaseTitle(docType)) {
    return formatStockDocumentPhaseTitle({ docType, status, viewerEntityCode })
  }
  return formatDocTypeLabel(docType)
}

/** Staff-facing document number — phase prefix aligned with title vocabulary. */
export function formatStaffFacingDocumentNumber(
  docType: DocType,
  status: DocStatus,
  storedRefNo: string | null | undefined,
  viewerEntityCode: DocumentEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE
): string {
  return formatBusinessDocumentNumber({
    docType,
    status,
    viewerEntityCode,
    storedRefNo,
  })
}

export function formatDocStatusLabel(status: DocStatus): string {
  return STATUS_LABELS[status] ?? status
}

export function docStatusToneClass(status: DocStatus): string {
  return STATUS_TONE[status] ?? "bg-zinc-100 text-zinc-800"
}

export function formatDocumentDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

export function currentPeriodMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}
