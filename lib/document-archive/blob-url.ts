/** Derive public Blob URL from pathname when BLOB_STORE_ID is configured. */
export function resolveDocumentArchivePdfBlobUrl(
  pdfPath: string,
  pdfBlobUrl?: string | null
): string | null {
  const explicit = String(pdfBlobUrl ?? "").trim()
  if (explicit) return explicit

  const pathname = String(pdfPath ?? "").trim().replace(/^\//, "")
  if (!pathname) return null

  const storeId = process.env.BLOB_STORE_ID?.trim()
  if (!storeId?.startsWith("store_")) return null

  const host = storeId.slice("store_".length).toLowerCase()
  return `https://${host}.public.blob.vercel-storage.com/${pathname}`
}
