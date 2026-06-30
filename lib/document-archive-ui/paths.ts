export function buildDocumentArchiveByDocumentDownloadPath(
  documentKind: string,
  documentId: string,
  archiveKind = "DOCUMENT_PDF"
): string {
  return `/api/document-archive/by-document/${encodeURIComponent(documentKind)}/${encodeURIComponent(documentId)}/file?archiveKind=${encodeURIComponent(archiveKind)}`
}

export function buildDocumentArchiveStatusPath(input: {
  documentKind: string
  documentId: string
  archiveKind?: string
  documentNo?: string
  workflowStatus?: string
}): string {
  const params = new URLSearchParams({
    documentKind: input.documentKind,
    documentId: input.documentId,
    archiveKind: input.archiveKind ?? "DOCUMENT_PDF",
  })
  if (input.documentNo?.trim()) {
    params.set("documentNo", input.documentNo.trim())
  }
  if (input.workflowStatus?.trim()) {
    params.set("workflowStatus", input.workflowStatus.trim())
  }
  return `/api/document-archive/status?${params.toString()}`
}
