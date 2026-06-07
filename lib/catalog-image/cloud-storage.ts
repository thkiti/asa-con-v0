import { CatalogImageError } from "./errors"

export type UploadCatalogProductImageParams = {
  productCode: string
  localFilePath: string
  contentType: "image/png"
}

export type UploadCatalogProductImageResult = {
  cloudPath: string
  publicUrl?: string | null
}

export function getCatalogProductCloudPath(productCode: string): string {
  return `catalog-products/${productCode}.png`
}

export async function uploadCatalogProductImage(
  _params: UploadCatalogProductImageParams
): Promise<UploadCatalogProductImageResult> {
  throw new CatalogImageError(
    "Catalog image cloud storage is not configured",
    "CATALOG_IMAGE_STORAGE_NOT_CONFIGURED",
    503
  )
}

export async function checkCatalogImageExists(
  _productCode: string
): Promise<boolean> {
  return false
}
