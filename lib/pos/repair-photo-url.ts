import { blobUrl } from "@/lib/blob-url"

export const REPAIR_PHOTO_PREFIX = "repair"

export function repairPhotoBlobPath(fileName: string): string {
  return `${REPAIR_PHOTO_PREFIX}/${fileName}`
}

/** Prefer Vercel Blob public url; fall back to blob base URL helper. */
export function resolveRepairPhotoUrl(
  fileName: string,
  options?: { url?: string | null; blobPath?: string | null }
): string {
  const direct = options?.url?.trim()
  if (direct) return direct
  const path = options?.blobPath?.trim() || repairPhotoBlobPath(fileName)
  const base = process.env.NEXT_PUBLIC_BLOB_BASE_URL?.replace(/\/+$/, "")
  if (base) {
    return `${base}/repair/${encodeURIComponent(fileName)}`
  }
  return blobUrl(path)
}
