import { buildManualJournalEntryPdfUrl } from "@/lib/finance-ui/manual-journal-entries"

/** Fetch archived PDF bytes when the snapshot is readable. */
export async function fetchLegacyArchivedPdfBlob(
  entryId: string,
  disposition: "inline" | "attachment",
  cacheKey?: string | null
): Promise<Blob | null> {
  const res = await fetch(
    buildManualJournalEntryPdfUrl(entryId, disposition, cacheKey)
  )
  if (!res.ok) return null
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("application/pdf")) return null
  return res.blob()
}

/** Open archived PDF inline in a new tab, or trigger download. */
export async function openLegacyArchivedPdf(
  input: {
    entryId: string
    entryNo: string
    disposition: "inline" | "attachment"
    cacheKey?: string | null
  }
): Promise<boolean> {
  const blob = await fetchLegacyArchivedPdfBlob(
    input.entryId,
    input.disposition,
    input.cacheKey
  )
  if (!blob) return false

  const blobUrl = URL.createObjectURL(blob)
  if (input.disposition === "inline") {
    window.open(blobUrl, "_blank", "noopener,noreferrer")
  } else {
    const anchor = document.createElement("a")
    anchor.href = blobUrl
    anchor.download = `${input.entryNo.replace(/[^\w.-]+/g, "_") || input.entryId}.pdf`
    anchor.click()
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  return true
}
