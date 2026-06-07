import { blobUrl } from "@/lib/blob-url"
import { listExistingProductCloudImages } from "./vercel-blob"

/** Resolve public catalog image URL for a product code, or null when none exists. */
export async function resolveCatalogProductImageUrl(
  productCode: string
): Promise<string | null> {
  try {
    const pathnames = await listExistingProductCloudImages(productCode)
    const pathname = pathnames[0]
    if (!pathname) return null
    return blobUrl(pathname)
  } catch {
    return null
  }
}
