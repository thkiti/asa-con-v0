import path from "path"
import { list } from "@vercel/blob"
import { getBlobAuthConfig } from "@/lib/catalog-image/vercel-blob"
import { resolveRepairPhotoUrl, REPAIR_PHOTO_PREFIX } from "@/lib/pos/repair-photo-url"

export type RepairPhotoListItem = {
  fileName: string
  blobPath: string
  url: string
}

const REPAIR_FILE_NAME_RE = /^REP-.+-\d{6}-\d{4}-\d{2}\.jpg$/i

function repairBlobListOptions(prefix: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  if (token) {
    return { prefix, token }
  }
  try {
    const auth = getBlobAuthConfig()
    if (auth.mode === "token") {
      return { prefix, token: auth.token }
    }
    return { prefix, oidcToken: auth.oidcToken, storeId: auth.storeId }
  } catch {
    return { prefix }
  }
}

function matchesBranch(fileName: string, branchCode: string | undefined): boolean {
  const branch = branchCode?.trim().toUpperCase()
  if (!branch) return true
  return fileName.toUpperCase().startsWith(`REP-${branch}-`)
}

/** List repair ticket photos from Vercel Blob; prefer blob.url for each item. */
export async function listRepairPhotos(
  branchCode?: string
): Promise<RepairPhotoListItem[]> {
  const prefix = `${REPAIR_PHOTO_PREFIX}/`
  const { blobs } = await list(repairBlobListOptions(prefix))

  return blobs
    .map((blob) => {
      const blobPath = blob.pathname
      const fileName = path.basename(blobPath)
      if (!REPAIR_FILE_NAME_RE.test(fileName)) return null
      if (!matchesBranch(fileName, branchCode)) return null
      const url = resolveRepairPhotoUrl(fileName, {
        url: blob.url,
        blobPath,
      })
      return { fileName, blobPath, url }
    })
    .filter((item): item is RepairPhotoListItem => item !== null)
    .sort((a, b) => a.fileName.localeCompare(b.fileName))
}
