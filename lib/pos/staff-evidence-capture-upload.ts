import { list, put } from "@vercel/blob"
import { getBlobAuthConfig } from "@/lib/catalog-image/vercel-blob"
import { CatalogImageError } from "@/lib/catalog-image/errors"
import {
  buildStaffEvidenceCaptureBlobPathForToken,
  verifyStaffEvidenceCaptureToken,
  type StaffEvidenceCaptureTokenClaims,
} from "@/lib/pos/staff-evidence-capture-token"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"

function blobPutOptions(contentType: string, allowOverwrite: boolean) {
  const auth = getBlobAuthConfig()
  const options = {
    access: "public" as const,
    allowOverwrite,
    contentType,
  }
  if (auth.mode === "token") {
    return { ...options, token: auth.token }
  }
  return { ...options, oidcToken: auth.oidcToken, storeId: auth.storeId }
}

export async function uploadStaffEvidenceCaptureToBlob(input: {
  token: string
  fileBuffer: Buffer
  contentType?: string
}): Promise<{ blobPathname: string; blobUrl: string }> {
  const claims = verifyStaffEvidenceCaptureToken(input.token)
  const contentType = input.contentType?.trim() || "image/jpeg"
  const blobPathname = buildStaffEvidenceCaptureBlobPathForToken(claims)

  try {
    const blob = await put(
      blobPathname,
      input.fileBuffer,
      blobPutOptions(contentType, true)
    )
    return { blobPathname: blob.pathname, blobUrl: blob.url }
  } catch (err) {
    if (err instanceof CatalogImageError) throw err
    const message =
      err instanceof Error ? err.message : "Failed to upload capture image to Blob storage"
    throw new CatalogImageError(message, "BLOB_UPLOAD_FAILED", 500)
  }
}

export async function findStaffEvidenceCaptureBlob(
  claims: StaffEvidenceCaptureTokenClaims
): Promise<{ pathname: string; url: string } | null> {
  const pathname = buildStaffEvidenceCaptureBlobPathForToken(claims)
  const auth = getBlobAuthConfig()
  const listOptions =
    auth.mode === "token"
      ? { prefix: pathname, token: auth.token }
      : { prefix: pathname, oidcToken: auth.oidcToken, storeId: auth.storeId }

  const { blobs } = await list(listOptions)
  const match = blobs.find((blob) => blob.pathname === pathname)
  if (!match) return null
  return { pathname: match.pathname, url: match.url }
}

export async function getStaffEvidenceCaptureUploadStatus(token: string): Promise<{
  ready: boolean
  blobUrl: string | null
  kind: StaffEvidenceFileKind
  staffId: string
}> {
  const claims = verifyStaffEvidenceCaptureToken(token)
  const blob = await findStaffEvidenceCaptureBlob(claims)
  return {
    ready: Boolean(blob),
    blobUrl: blob?.url ?? null,
    kind: claims.kind,
    staffId: claims.staffId,
  }
}
