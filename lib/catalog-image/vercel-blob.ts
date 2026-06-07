import fs from "fs/promises"
import path from "path"
import { list, put } from "@vercel/blob"
import { getCatalogProductImageDir } from "./config"
import { CatalogImageError } from "./errors"
import { assertSafeProductCode } from "./paths"
import {
  CATALOG_PRODUCT_IMAGE_EXTENSIONS,
  findExistingProductImageFiles,
  getImageExtensionFromFileName,
  isCatalogProductImageExtension,
} from "./product-image-files"

export type CloudUploadItemStatus =
  | "UPLOADED"
  | "SKIPPED_EXISTS"
  | "LOCAL_MISSING"
  | "LOCAL_DUPLICATE"
  | "ERROR"

export type CloudUploadItemResult = {
  productCode: string
  status: CloudUploadItemStatus
  cloudPath?: string
  url?: string
  error?: string
}

export type CloudUploadSummary = {
  uploaded: number
  skippedExists: number
  localMissing: number
  localDuplicate: number
  error: number
}

const CLOUD_PRODUCT_PREFIX = "products"

export type BlobAuthConfig =
  | { mode: "token"; token: string }
  | { mode: "oidc"; oidcToken: string; storeId: string }

// Local dev: BLOB_READ_WRITE_TOKEN OR VERCEL_OIDC_TOKEN + BLOB_STORE_ID from vercel env pull. BLOB_WEBHOOK_PUBLIC_KEY not needed for server upload.
export function getBlobAuthConfig(): BlobAuthConfig {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  if (token) {
    return { mode: "token", token }
  }

  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim()
  const storeId = process.env.BLOB_STORE_ID?.trim()
  if (oidcToken && storeId) {
    return { mode: "oidc", oidcToken, storeId }
  }

  throw new CatalogImageError(
    "Blob storage auth is not configured. Set BLOB_READ_WRITE_TOKEN, or VERCEL_OIDC_TOKEN and BLOB_STORE_ID (run `vercel env pull`).",
    "BLOB_AUTH_NOT_CONFIGURED",
    503
  )
}

function blobListOptions(prefix: string) {
  const auth = getBlobAuthConfig()
  if (auth.mode === "token") {
    return { prefix, token: auth.token }
  }
  return { prefix, oidcToken: auth.oidcToken, storeId: auth.storeId }
}

function blobPutOptions(
  options: {
    access: "public"
    allowOverwrite: boolean
    contentType: string
  }
) {
  const auth = getBlobAuthConfig()
  if (auth.mode === "token") {
    return { ...options, token: auth.token }
  }
  return { ...options, oidcToken: auth.oidcToken, storeId: auth.storeId }
}

function contentTypeForExtension(ext: string): string {
  const normalized = ext.toLowerCase()
  switch (normalized) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".webp":
      return "image/webp"
    default:
      return "application/octet-stream"
  }
}

export function getProductCloudPath(
  productCode: string,
  extension: string
): string {
  const safeCode = assertSafeProductCode(productCode)
  const ext = extension.startsWith(".") ? extension : `.${extension}`
  if (!isCatalogProductImageExtension(ext)) {
    throw new CatalogImageError(
      `Unsupported image extension: ${ext}`,
      "INVALID_IMAGE_EXTENSION",
      400
    )
  }
  return `${CLOUD_PRODUCT_PREFIX}/${safeCode}${ext.toLowerCase()}`
}

function isAllowedCloudProductBlob(
  blobPathname: string,
  productCode: string
): boolean {
  const safeCode = assertSafeProductCode(productCode)
  const prefix = `${CLOUD_PRODUCT_PREFIX}/${safeCode}`
  if (!blobPathname.startsWith(prefix)) return false
  const ext = path.extname(blobPathname).toLowerCase()
  return isCatalogProductImageExtension(ext)
}

export async function listExistingProductCloudImages(
  productCode: string
): Promise<string[]> {
  const safeCode = assertSafeProductCode(productCode)
  const prefix = `${CLOUD_PRODUCT_PREFIX}/${safeCode}`
  const { blobs } = await list(blobListOptions(prefix))
  return blobs
    .map((blob) => blob.pathname)
    .filter((pathname) => isAllowedCloudProductBlob(pathname, safeCode))
}

export async function uploadProductImageToBlob(
  localFilePath: string,
  productCode: string
): Promise<{ cloudPath: string; url: string }> {
  const safeCode = assertSafeProductCode(productCode)
  const fileName = path.basename(localFilePath)
  const ext = getImageExtensionFromFileName(fileName)
  if (!ext) {
    throw new CatalogImageError(
      `Local file is not a catalog product image: ${fileName}`,
      "INVALID_LOCAL_IMAGE",
      400
    )
  }

  const cloudPath = getProductCloudPath(safeCode, ext)
  const fileBuffer = await fs.readFile(localFilePath)

  const blob = await put(
    cloudPath,
    fileBuffer,
    blobPutOptions({
      access: "public",
      allowOverwrite: false,
      contentType: contentTypeForExtension(ext),
    })
  )

  return { cloudPath, url: blob.url }
}

function buildCloudUploadSummary(
  results: CloudUploadItemResult[]
): CloudUploadSummary {
  return results.reduce<CloudUploadSummary>(
    (summary, item) => {
      switch (item.status) {
        case "UPLOADED":
          summary.uploaded += 1
          break
        case "SKIPPED_EXISTS":
          summary.skippedExists += 1
          break
        case "LOCAL_MISSING":
          summary.localMissing += 1
          break
        case "LOCAL_DUPLICATE":
          summary.localDuplicate += 1
          break
        case "ERROR":
          summary.error += 1
          break
      }
      return summary
    },
    {
      uploaded: 0,
      skippedExists: 0,
      localMissing: 0,
      localDuplicate: 0,
      error: 0,
    }
  )
}

export async function uploadProductImagesToBlob(
  productCodes: string[]
): Promise<{ results: CloudUploadItemResult[]; summary: CloudUploadSummary }> {
  const imageDir = getCatalogProductImageDir()
  const results: CloudUploadItemResult[] = []

  for (const rawCode of productCodes) {
    let productCode: string
    try {
      productCode = assertSafeProductCode(String(rawCode ?? "").trim())
    } catch (err) {
      results.push({
        productCode: String(rawCode ?? "").trim() || "(empty)",
        status: "ERROR",
        error: err instanceof Error ? err.message : "Invalid product code",
      })
      continue
    }

    try {
      const existingCloud = await listExistingProductCloudImages(productCode)
      if (existingCloud.length > 0) {
        results.push({
          productCode,
          status: "SKIPPED_EXISTS",
          cloudPath: existingCloud[0],
        })
        continue
      }

      const localFiles = await findExistingProductImageFiles(
        imageDir,
        productCode
      )

      if (localFiles.length === 0) {
        results.push({ productCode, status: "LOCAL_MISSING" })
        continue
      }

      if (localFiles.length > 1) {
        results.push({ productCode, status: "LOCAL_DUPLICATE" })
        continue
      }

      const uploaded = await uploadProductImageToBlob(
        localFiles[0]!,
        productCode
      )
      results.push({
        productCode,
        status: "UPLOADED",
        cloudPath: uploaded.cloudPath,
        url: uploaded.url,
      })
    } catch (err) {
      results.push({
        productCode,
        status: "ERROR",
        error: err instanceof Error ? err.message : "Upload failed",
      })
    }
  }

  return { results, summary: buildCloudUploadSummary(results) }
}
