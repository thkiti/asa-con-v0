import { buildDocumentArchiveByDocumentDownloadPath } from "@/lib/document-archive-ui/paths"

/** Fetch document vault PDF bytes when the archive is readable. */
export async function fetchDocumentArchivePdfBlob(
  documentKind: string,
  documentId: string
): Promise<Blob | null> {
  const res = await fetch(
    buildDocumentArchiveByDocumentDownloadPath(documentKind, documentId)
  )
  if (!res.ok) return null
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("application/pdf")) return null
  return res.blob()
}

/** Open document vault PDF inline in a new tab. */
export async function openDocumentArchivePdf(input: {
  documentKind: string
  documentId: string
  documentNo: string
}): Promise<boolean> {
  const blob = await fetchDocumentArchivePdfBlob(
    input.documentKind,
    input.documentId
  )
  if (!blob) return false

  const blobUrl = URL.createObjectURL(blob)
  window.open(blobUrl, "_blank", "noopener,noreferrer")
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  return true
}
