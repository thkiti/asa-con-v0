import fs from "fs/promises"
import path from "path"
import {
  ensureCatalogProductImageDir,
  getImageExtensionFromFileName,
  getProductCodeFromImageFileName,
  isCatalogProductImageFileName,
} from "@/lib/catalog-image/product-image-files"

export type CatalogUploadScanRow = {
  productCode: string
  fileName: string
  extension: string
  sizeBytes: number
  modifiedAt: string
  productStatus: "MATCHED" | "UNMATCHED"
  localStatus: "OK" | "DUPLICATE"
  uploadStatus: "NOT_CHECKED"
}

type ProductLookupDb = {
  product: {
    findUnique: (args: {
      where: { code: string }
      select: { id: true }
    }) => Promise<{ id: string } | null>
  }
}

export async function scanCatalogProductImages(
  db: ProductLookupDb
): Promise<{
  imageDir: string
  rows: CatalogUploadScanRow[]
  duplicateBasenames: string[]
}> {
  const imageDir = await ensureCatalogProductImageDir()
  const entries = await fs.readdir(imageDir, { withFileTypes: true })

  const candidateFiles: Array<{
    fileName: string
    productCode: string
    extension: string
    sizeBytes: number
    modifiedAt: string
  }> = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!isCatalogProductImageFileName(entry.name)) continue

    const productCode = getProductCodeFromImageFileName(entry.name)
    const extension = getImageExtensionFromFileName(entry.name)
    if (!productCode || !extension) continue

    const fullPath = path.join(imageDir, entry.name)
    const stat = await fs.stat(fullPath)
    candidateFiles.push({
      fileName: entry.name,
      productCode,
      extension,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    })
  }

  const countByCode = new Map<string, number>()
  for (const file of candidateFiles) {
    countByCode.set(
      file.productCode,
      (countByCode.get(file.productCode) ?? 0) + 1
    )
  }

  const duplicateBasenames = [...countByCode.entries()]
    .filter(([, count]) => count > 1)
    .map(([code]) => code)
    .sort()

  const rows: CatalogUploadScanRow[] = []

  for (const file of candidateFiles) {
    const product = await db.product.findUnique({
      where: { code: file.productCode },
      select: { id: true },
    })

    rows.push({
      productCode: file.productCode,
      fileName: file.fileName,
      extension: file.extension,
      sizeBytes: file.sizeBytes,
      modifiedAt: file.modifiedAt,
      productStatus: product ? "MATCHED" : "UNMATCHED",
      localStatus:
        (countByCode.get(file.productCode) ?? 0) > 1 ? "DUPLICATE" : "OK",
      uploadStatus: "NOT_CHECKED",
    })
  }

  rows.sort((a, b) => {
    const codeCmp = a.productCode.localeCompare(b.productCode)
    if (codeCmp !== 0) return codeCmp
    return a.fileName.localeCompare(b.fileName)
  })

  return {
    imageDir,
    rows,
    duplicateBasenames,
  }
}
