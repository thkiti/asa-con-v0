import { blobUrl } from "@/lib/blob-url"
import { listExistingProductCloudImageBlobs } from "./vercel-blob"

/** Resolve public catalog image URL for a product code, or null when none exists. */
export async function resolveCatalogProductImageUrl(
  productCode: string
): Promise<string | null> {
  try {
    const blobs = await listExistingProductCloudImageBlobs(productCode)
    const match = blobs[0]
    if (!match) return null
    if (match.url) return match.url
    return blobUrl(match.pathname)
  } catch {
    return null
  }
}
