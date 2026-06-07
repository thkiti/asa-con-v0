import fs from "fs/promises"
import { CatalogImageError } from "./errors"
import {
  ensureCatalogProductImageDir,
  hasProductImageConflict,
  removeProductImageFilesForCode,
} from "./product-image-files"
import {
  assertSafeProductCode,
  resolveFinalProductImagePath,
  resolveWorkFilePath,
} from "./paths"

export type SaveMatchedItemInput = {
  productCode: string
  localFilePath: string
  replace?: boolean
}

export type SaveMatchedItemStatus = "SAVED" | "DUPLICATE" | "ERROR"

export type SaveMatchedItemResult = {
  productCode: string
  finalFilePath: string
  finalFileName: string
  status: SaveMatchedItemStatus
  error?: string
}

type ProductLookupDb = {
  product: {
    findUnique: (args: {
      where: { code: string }
      select: { id: true }
    }) => Promise<{ id: string } | null>
  }
}

function buildErrorResult(
  productCode: string,
  message: string
): SaveMatchedItemResult {
  let finalFileName = ""
  let finalFilePath = ""
  try {
    const safeCode = assertSafeProductCode(productCode)
    finalFileName = `${safeCode}.png`
    finalFilePath = resolveFinalProductImagePath(safeCode)
  } catch {
    finalFileName = productCode ? `${productCode}.png` : ""
  }

  return {
    productCode,
    finalFilePath,
    finalFileName,
    status: "ERROR",
    error: message,
  }
}

export async function saveMatchedCatalogImages(
  db: ProductLookupDb,
  items: SaveMatchedItemInput[]
): Promise<SaveMatchedItemResult[]> {
  const imageDir = await ensureCatalogProductImageDir()
  const results: SaveMatchedItemResult[] = []

  for (const item of items) {
    const productCode = String(item.productCode ?? "").trim()
    if (!productCode) {
      results.push(buildErrorResult("", "productCode is required"))
      continue
    }

    let safeCode: string
    let finalFileName: string
    let finalFilePath: string
    try {
      safeCode = assertSafeProductCode(productCode)
      finalFileName = `${safeCode}.png`
      finalFilePath = resolveFinalProductImagePath(safeCode)
    } catch (err) {
      const message =
        err instanceof CatalogImageError ? err.message : "Invalid product code"
      results.push(buildErrorResult(productCode, message))
      continue
    }

    try {
      const product = await db.product.findUnique({
        where: { code: safeCode },
        select: { id: true },
      })
      if (!product) {
        results.push({
          productCode: safeCode,
          finalFilePath,
          finalFileName,
          status: "ERROR",
          error: "Product not found",
        })
        continue
      }

      let sourcePath: string
      try {
        sourcePath = resolveWorkFilePath(item.localFilePath)
      } catch (err) {
        const message =
          err instanceof CatalogImageError
            ? err.message
            : "Source path is invalid"
        results.push({
          productCode: safeCode,
          finalFilePath,
          finalFileName,
          status: "ERROR",
          error: message,
        })
        continue
      }

      try {
        await fs.access(sourcePath)
      } catch {
        results.push({
          productCode: safeCode,
          finalFilePath,
          finalFileName,
          status: "ERROR",
          error: "Source file not found",
        })
        continue
      }

      const replace = item.replace === true
      const hasConflict = await hasProductImageConflict(imageDir, safeCode)

      if (hasConflict && !replace) {
        results.push({
          productCode: safeCode,
          finalFilePath,
          finalFileName,
          status: "DUPLICATE",
        })
        continue
      }

      if (replace && hasConflict) {
        await removeProductImageFilesForCode(imageDir, safeCode)
      }

      await fs.copyFile(sourcePath, finalFilePath)
      results.push({
        productCode: safeCode,
        finalFilePath,
        finalFileName,
        status: "SAVED",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed"
      results.push({
        productCode: safeCode,
        finalFilePath,
        finalFileName,
        status: "ERROR",
        error: message,
      })
    }
  }

  return results
}
