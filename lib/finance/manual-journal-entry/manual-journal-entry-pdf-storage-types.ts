export type ManualJournalPdfStorageBackend = "filesystem" | "blob"

export type StoredManualJournalPdfRef = {
  pdfPath: string
  pdfBlobUrl: string | null
}

export type ManualJournalPdfReadRef = {
  pdfPath: string
  pdfBlobUrl?: string | null
}
