import { randomUUID } from "crypto"
import fs from "fs/promises"
import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { cropCatalogPdf } from "@/lib/catalog-image/crop-pdf"
import { CatalogImageError, catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { resolveInputPdfPath } from "@/lib/catalog-image/paths"
import { parseOptionalPageNo } from "@/lib/catalog-image/parse-page-no"
import { parseCropAreaInput } from "@/lib/catalog-image/validate-crop-template"

type CropPreviewBody = {
  fileName?: string
  rotateDeg?: number
  columns?: number
  rows?: number
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
  pageNo?: number
}

export async function POST(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
    const body = (await req.json()) as CropPreviewBody

    const fileName = String(body.fileName ?? "").trim()
    if (!fileName) {
      throw new CatalogImageError("fileName is required", "VALIDATION_ERROR", 400)
    }

    const pdfPath = resolveInputPdfPath(fileName)
    try {
      await fs.access(pdfPath)
    } catch {
      throw new CatalogImageError("PDF file not found", "FILE_NOT_FOUND", 404)
    }

    const cropArea = parseCropAreaInput(body)
    const pageNo = parseOptionalPageNo(body.pageNo)

    const result = await cropCatalogPdf({
      pdfPath,
      batchId: randomUUID(),
      rotateDeg: Number(body.rotateDeg ?? 180),
      columns: Number(body.columns ?? 3),
      rows: Number(body.rows ?? 2),
      cropArea,
      ...(pageNo != null ? { pageNo } : {}),
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "POST catalog-image/crop-preview error")
  }
}
