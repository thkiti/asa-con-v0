import { put } from "@vercel/blob"
import { getBlobAuthConfig } from "@/lib/catalog-image/vercel-blob"
import { CatalogImageError } from "@/lib/catalog-image/errors"
import { buildStaffEvidenceBlobPath, type StaffEvidenceFileKind } from "./staff-evidence-blob"

function blobPutOptions(contentType: string) {
  const auth = getBlobAuthConfig()
  const options = {
    access: "public" as const,
    allowOverwrite: true,
    contentType,
  }
  if (auth.mode === "token") {
    return { ...options, token: auth.token }
  }
  return { ...options, oidcToken: auth.oidcToken, storeId: auth.storeId }
}

export async function uploadStaffEvidenceToBlob(input: {
  staffId: string
  kind: StaffEvidenceFileKind
  fileBuffer: Buffer
  contentType?: string
}): Promise<{ blobPathname: string; blobUrl: string }> {
  const contentType = input.contentType?.trim() || "image/jpeg"
  const blobPathname = buildStaffEvidenceBlobPath(input.staffId, input.kind)

  try {
    const blob = await put(blobPathname, input.fileBuffer, blobPutOptions(contentType))
    return { blobPathname: blob.pathname, blobUrl: blob.url }
  } catch (err) {
    if (err instanceof CatalogImageError) {
      throw err
    }
    const message =
      err instanceof Error ? err.message : "Failed to upload staff evidence to Blob storage"
    throw new CatalogImageError(message, "BLOB_UPLOAD_FAILED", 500)
  }
}
