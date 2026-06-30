import type { DocumentArchiveKind, DocumentKind } from "@/generated/prisma/client"
import type { ArchiveRequirementPolicy } from "./kinds"
import type { DocumentArchiveStorageFields } from "./types"

export type DocumentArchiveTriState = boolean | null

export type DocumentArchiveStatusSource = "vault" | "legacy" | "policy" | "none"

export type DocumentArchiveStatusResult = {
  pdfAvailable: DocumentArchiveTriState
  /** COL pay-in slip and similar evidence columns; null when not applicable. */
  archiveAvailable: DocumentArchiveTriState
  source: DocumentArchiveStatusSource
}

export type DocumentArchiveStatusInput = {
  documentKind: DocumentKind
  documentId: string
  documentNo?: string | null
  archiveKind: DocumentArchiveKind
  legalEntityCode?: string | null
  branchId?: string | null
  workflowStatus?: string | null
  legacyPdfPath?: string | null
  legacyPdfBlobUrl?: string | null
  legacyDocumentArchive?: DocumentArchiveStorageFields | null
  /** Denormalized Receipt.pdfPath when archive row is not loaded. */
  legacyReceiptPdfPath?: string | null
  requiredPolicy?: ArchiveRequirementPolicy
}

export type VaultArchiveRecord = {
  archiveId: string
  archiveKind: DocumentArchiveKind
  status: string
  storagePath: string | null
  storageUrl: string | null
  pdfPath: string | null
  pdfBlobUrl: string | null
  mimeType: string | null
}
