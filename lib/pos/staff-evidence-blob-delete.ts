import { del } from "@vercel/blob"
import { getBlobAuthConfig } from "@/lib/catalog-image/vercel-blob"
import { CatalogImageError } from "@/lib/catalog-image/errors"

function blobDelOptions() {
  const auth = getBlobAuthConfig()
  if (auth.mode === "token") {
    return { token: auth.token }
  }
  return { oidcToken: auth.oidcToken, storeId: auth.storeId }
}

export async function deleteStaffEvidenceBlobUrl(blobUrl: string): Promise<void> {
  const url = String(blobUrl ?? "").trim()
  if (!url) return

  try {
    await del(url, blobDelOptions())
  } catch (err) {
    if (err instanceof CatalogImageError) {
      throw err
    }
    const message =
      err instanceof Error ? err.message : "Failed to delete staff evidence from Blob storage"
    throw new CatalogImageError(message, "BLOB_DELETE_FAILED", 500)
  }
}
