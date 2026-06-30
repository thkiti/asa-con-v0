import type { DocumentArchiveKind, DocumentKind } from "@/generated/prisma/client"
import {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
} from "./errors"
import type { ArchiveRequirementPolicy } from "./kinds"

export const MAX_DOCUMENT_ARCHIVE_FILE_BYTES = 12 * 1024 * 1024

const DOCUMENT_KIND_VALUES = new Set<string>([
  "OPB",
  "MJV",
  "PAY",
  "PAV",
  "REV",
  "PCV",
  "CNT",
  "ADJ",
  "ORD",
  "DEY",
  "ORS",
  "ORI",
  "REC",
  "REF",
  "COL",
  "READ_X",
  "READ_Z",
])

const ARCHIVE_KIND_VALUES = new Set<string>([
  "DOCUMENT_PDF",
  "BANK_PAY_IN_SLIP",
  "RECEIPT_SLIP",
  "REFUND_SLIP",
  "READ_REPORT",
])

const CLIENT_REJECTED_ARCHIVE_STATUSES = new Set<string>(["SUPERSEDED", "VOID"])

const MIME_TYPES_BY_ARCHIVE_KIND: Record<DocumentArchiveKind, readonly string[]> = {
  DOCUMENT_PDF: ["application/pdf"],
  RECEIPT_SLIP: ["application/pdf"],
  REFUND_SLIP: ["application/pdf"],
  READ_REPORT: ["application/pdf"],
  BANK_PAY_IN_SLIP: ["application/pdf", "image/jpeg", "image/png"],
}

export type DocumentArchiveLinkInput = {
  documentKind: DocumentKind
  documentId: string
  documentNo: string
  linkType?: string | null
}

export function parseDocumentKind(value: unknown): DocumentKind {
  const raw = String(value ?? "").trim()
  if (!DOCUMENT_KIND_VALUES.has(raw)) {
    throw new DocumentArchiveError(
      `Invalid documentKind: ${raw || "(empty)"}`,
      DocumentArchiveErrorCodes.INVALID_KIND
    )
  }
  return raw as DocumentKind
}

export function parseDocumentArchiveKind(value: unknown): DocumentArchiveKind {
  const raw = String(value ?? "").trim()
  if (!ARCHIVE_KIND_VALUES.has(raw)) {
    throw new DocumentArchiveError(
      `Invalid archiveKind: ${raw || "(empty)"}`,
      DocumentArchiveErrorCodes.INVALID_KIND
    )
  }
  return raw as DocumentArchiveKind
}

export function parseArchiveRequirementPolicy(
  value: unknown
): ArchiveRequirementPolicy | undefined {
  const raw = String(value ?? "").trim().toLowerCase()
  if (!raw) return undefined
  if (raw === "required" || raw === "optional" || raw === "unsupported") {
    return raw
  }
  throw new DocumentArchiveError(
    `Invalid requiredPolicy: ${raw}`,
    DocumentArchiveErrorCodes.VALIDATION_ERROR
  )
}

export function assertClientArchiveStatusNotRejected(status: unknown): void {
  const raw = String(status ?? "").trim().toUpperCase()
  if (CLIENT_REJECTED_ARCHIVE_STATUSES.has(raw)) {
    throw new DocumentArchiveError(
      "Client may not upload archives with SUPERSEDED or VOID status",
      DocumentArchiveErrorCodes.VALIDATION_ERROR
    )
  }
}

export function normalizeMimeType(
  fileName: string | null | undefined,
  contentType: string | null | undefined
): string {
  const fromHeader = String(contentType ?? "").trim().toLowerCase()
  if (fromHeader) return fromHeader

  const lowerName = String(fileName ?? "").trim().toLowerCase()
  if (lowerName.endsWith(".pdf")) return "application/pdf"
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "image/jpeg"
  }
  if (lowerName.endsWith(".png")) return "image/png"
  return ""
}

export function assertMimeTypeAllowedForArchiveKind(
  archiveKind: DocumentArchiveKind,
  mimeType: string
): void {
  const normalized = String(mimeType ?? "").trim().toLowerCase()
  const allowed = MIME_TYPES_BY_ARCHIVE_KIND[archiveKind]
  if (!normalized || !allowed.includes(normalized)) {
    throw new DocumentArchiveError(
      `Mime type ${normalized || "(empty)"} is not allowed for archiveKind ${archiveKind}`,
      DocumentArchiveErrorCodes.INVALID_MIME_TYPE
    )
  }
}

export function parseDocumentArchiveLinks(value: unknown): DocumentArchiveLinkInput[] {
  let parsed: unknown = value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      throw new DocumentArchiveError(
        "At least one archive link is required",
        DocumentArchiveErrorCodes.LINKS_REQUIRED
      )
    }
    try {
      parsed = JSON.parse(trimmed) as unknown
    } catch {
      throw new DocumentArchiveError(
        "links must be valid JSON",
        DocumentArchiveErrorCodes.VALIDATION_ERROR
      )
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new DocumentArchiveError(
      "At least one archive link is required",
      DocumentArchiveErrorCodes.LINKS_REQUIRED
    )
  }

  return parsed.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new DocumentArchiveError(
        `links[${index}] must be an object`,
        DocumentArchiveErrorCodes.VALIDATION_ERROR
      )
    }
    const record = row as Record<string, unknown>
    const documentKind = parseDocumentKind(record.documentKind)
    const documentId = String(record.documentId ?? "").trim()
    const documentNo = String(record.documentNo ?? "").trim()
    if (!documentId || !documentNo) {
      throw new DocumentArchiveError(
        `links[${index}] requires documentId and documentNo`,
        DocumentArchiveErrorCodes.VALIDATION_ERROR
      )
    }
    const linkTypeRaw = record.linkType
    const linkType =
      linkTypeRaw == null ? undefined : String(linkTypeRaw).trim() || undefined
    return { documentKind, documentId, documentNo, linkType }
  })
}

export function assertArchiveFileSize(buffer: Buffer): void {
  if (!buffer.length) {
    throw new DocumentArchiveError(
      "Upload file is empty",
      DocumentArchiveErrorCodes.EMPTY_FILE
    )
  }
  if (buffer.length > MAX_DOCUMENT_ARCHIVE_FILE_BYTES) {
    throw new DocumentArchiveError(
      `Upload file exceeds ${MAX_DOCUMENT_ARCHIVE_FILE_BYTES} bytes`,
      DocumentArchiveErrorCodes.FILE_TOO_LARGE
    )
  }
}

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf"
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    default:
      return "bin"
  }
}
