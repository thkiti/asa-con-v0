import fs from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { getCatalogImageInputDir } from "@/lib/catalog-image/config"
import { CatalogImageError, catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import {
  createUniqueInputPdfFileName,
  ensureCatalogImageDirs,
} from "@/lib/catalog-image/paths"

function isTruncatedOrOversizedFormDataError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()
  return (
    lower.includes("expected boundary") ||
    lower.includes("failed to parse body as formdata") ||
    lower.includes("request body exceeded")
  )
}

async function readOpenFileFormData(req: Request): Promise<FormData> {
  const contentType = req.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new CatalogImageError(
      "PDF file upload is required",
      "VALIDATION_ERROR",
      400
    )
  }

  try {
    return await req.formData()
  } catch (err: unknown) {
    console.error("POST catalog-image/open-file formData parse failed:", err)
    if (isTruncatedOrOversizedFormDataError(err)) {
      throw new CatalogImageError(
        "PDF file is too large. Maximum upload size is 50MB.",
        "PDF_FILE_TOO_LARGE",
        413
      )
    }
    throw new CatalogImageError(
      "PDF file upload is required",
      "VALIDATION_ERROR",
      400
    )
  }
}

export async function POST(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
    const formData = await readOpenFileFormData(req)
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      const keys = [...formData.keys()]
      console.error(
        "POST catalog-image/open-file missing file field. formData keys:",
        keys
      )
      throw new CatalogImageError("PDF file is required", "VALIDATION_ERROR", 400)
    }

    const fileName = createUniqueInputPdfFileName(file.name)
    await ensureCatalogImageDirs()
    const destPath = path.join(getCatalogImageInputDir(), fileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(destPath, buffer)

    return NextResponse.json({
      fileName,
      inputPath: destPath,
      originalFileName: file.name,
    })
  } catch (err: unknown) {
    if (err instanceof CatalogImageError) {
      console.error(
        "POST catalog-image/open-file failed:",
        err.code,
        err.message
      )
    } else {
      console.error("POST catalog-image/open-file failed:", err)
    }
    return catalogImageErrorResponse(err, "POST catalog-image/open-file error")
  }
}
