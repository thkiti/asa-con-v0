import type { DocumentArchiveKind, DocumentKind } from "@/generated/prisma/client"

export type { DocumentArchiveKind, DocumentKind }

export type ArchiveRequirementPolicy = "required" | "optional" | "unsupported"

/** Document kinds with posted PDF archive expectation. */
export const POSTED_PDF_REQUIRED_DOCUMENT_KINDS = new Set<DocumentKind>([
  "MJV",
  "OPB",
  "PAV",
  "REV",
  "PCV",
  "CNT",
  "ADJ",
  "ORD",
  "DEY",
  "ORS",
  "ORI",
])

/** Stock inquiry phase codes map 1:1 to vault document kinds. */
export const STOCK_DOCUMENT_ARCHIVE_KINDS = new Set<DocumentKind>([
  "CNT",
  "ADJ",
  "ORD",
  "DEY",
  "ORS",
  "ORI",
])

/** Document kinds where archive column stays neutral until a later phase. */
export const ARCHIVE_UNSUPPORTED_DOCUMENT_KINDS = new Set<DocumentKind>([
  "PAY",
  "REF",
])

function isPostedPdfRequiredWorkflowStatus(
  documentKind: DocumentKind,
  workflowStatus: string
): boolean {
  const status = workflowStatus.trim().toUpperCase()
  if (status === "POSTED") return true
  if (STOCK_DOCUMENT_ARCHIVE_KINDS.has(documentKind) && status === "TRANSFERRED") {
    return true
  }
  return false
}

export function buildDocumentArchiveRefKey(
  documentKind: string,
  documentId: string,
  archiveKind?: string
): string {
  const kind = String(documentKind ?? "").trim()
  const id = String(documentId ?? "").trim()
  const archive = String(archiveKind ?? "").trim()
  return archive ? `${kind}:${id}:${archive}` : `${kind}:${id}`
}

export function defaultArchiveKindForDocumentKind(
  documentKind: DocumentKind
): DocumentArchiveKind | null {
  switch (documentKind) {
    case "REC":
      return "RECEIPT_SLIP"
    case "REF":
      return "REFUND_SLIP"
    case "COL":
      return "BANK_PAY_IN_SLIP"
    case "READ_X":
    case "READ_Z":
      return "READ_REPORT"
    case "MJV":
    case "OPB":
    case "PAV":
    case "REV":
    case "PCV":
    case "PAY":
    case "CNT":
    case "ADJ":
    case "ORD":
    case "DEY":
    case "ORS":
    case "ORI":
      return "DOCUMENT_PDF"
    default:
      return null
  }
}

export function resolveArchiveRequirementPolicy(input: {
  documentKind: DocumentKind
  archiveKind: DocumentArchiveKind
  workflowStatus?: string | null
  requiredPolicy?: ArchiveRequirementPolicy
}): ArchiveRequirementPolicy {
  if (input.requiredPolicy) {
    return input.requiredPolicy
  }

  const { documentKind, archiveKind } = input
  const workflowStatus = String(input.workflowStatus ?? "").trim().toUpperCase()

  if (documentKind === "COL" && archiveKind === "BANK_PAY_IN_SLIP") {
    return "unsupported"
  }

  if (
    POSTED_PDF_REQUIRED_DOCUMENT_KINDS.has(documentKind) &&
    archiveKind === "DOCUMENT_PDF"
  ) {
    return isPostedPdfRequiredWorkflowStatus(documentKind, workflowStatus)
      ? "required"
      : "optional"
  }

  if (
    ARCHIVE_UNSUPPORTED_DOCUMENT_KINDS.has(documentKind) &&
    archiveKind === "DOCUMENT_PDF"
  ) {
    return "unsupported"
  }

  if (documentKind === "REC" && archiveKind === "RECEIPT_SLIP") {
    return "optional"
  }

  if (documentKind === "REF" && archiveKind === "REFUND_SLIP") {
    return "unsupported"
  }

  if (documentKind === "COL") {
    return "unsupported"
  }

  if (["READ_X", "READ_Z"].includes(documentKind) && archiveKind === "READ_REPORT") {
    return "unsupported"
  }

  return "unsupported"
}
