import fs from "fs/promises"
import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import {
  checkCatalogImageExists,
  getCatalogProductCloudPath,
  uploadCatalogProductImage,
} from "@/lib/catalog-image/cloud-storage"
import { CatalogImageError, catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import {
  resolveFinalProductImagePath,
  resolveFinalWorkFilePath,
} from "@/lib/catalog-image/paths"
import { prisma } from "@/lib/shared/prisma"

type UploadBody = {
  productCode?: string
  localFilePath?: string
  replace?: boolean
}

export async function POST(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
    const body = (await req.json()) as UploadBody

    const productCode = String(body.productCode ?? "").trim()
    if (!productCode) {
      throw new CatalogImageError("productCode is required", "VALIDATION_ERROR", 400)
    }

    const localFilePath = String(body.localFilePath ?? "").trim()
    if (!localFilePath) {
      throw new CatalogImageError("localFilePath is required", "VALIDATION_ERROR", 400)
    }

    const product = await prisma.product.findUnique({
      where: { code: productCode },
      select: { id: true },
    })
    if (!product) {
      throw new CatalogImageError("Product not found", "PRODUCT_NOT_FOUND", 404)
    }

    const resolvedPath = resolveFinalWorkFilePath(localFilePath)
    const expectedPath = resolveFinalProductImagePath(productCode)
    if (resolvedPath !== expectedPath) {
      throw new CatalogImageError(
        "File path must match final product image path",
        "VALIDATION_ERROR",
        400
      )
    }
    try {
      await fs.access(resolvedPath)
    } catch {
      throw new CatalogImageError("Image file not found", "FILE_NOT_FOUND", 404)
    }

    const exists = await checkCatalogImageExists(productCode)
    if (exists && !body.replace) {
      return NextResponse.json(
        {
          error: "Catalog image already exists",
          code: "DUPLICATE",
          cloudPath: getCatalogProductCloudPath(productCode),
        },
        { status: 409 }
      )
    }

    const result = await uploadCatalogProductImage({
      productCode,
      localFilePath: resolvedPath,
      contentType: "image/png",
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "POST catalog-image/upload error")
  }
}
