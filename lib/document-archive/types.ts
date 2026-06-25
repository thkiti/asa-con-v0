import type {
  DocumentArchiveStatus,
  DocumentArchiveType,
} from "@/generated/prisma/client"

export type { DocumentArchiveStatus, DocumentArchiveType }

export type DocumentArchiveStorageBackend = "filesystem" | "blob"

export type StoredDocumentPdfRef = {
  pdfPath: string
  pdfBlobUrl: string | null
}

export type DocumentPdfReadRef = {
  pdfPath: string
  pdfBlobUrl?: string | null
}

export type DocumentArchivePdfFields = {
  status: DocumentArchiveStatus | string
  pdfPath: string | null
  pdfBlobUrl?: string | null
  errorMessage?: string | null
}

export type DocumentArchiveReadinessStatus = "ready" | "pending" | "failed"
