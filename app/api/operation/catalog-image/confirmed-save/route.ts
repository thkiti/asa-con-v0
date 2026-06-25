import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import {
  confirmedSaveCatalogImages,
  confirmedSaveCatalogImagesFromBlobs,
} from "@/lib/catalog-image/confirmed-save"
import { CatalogImageError, catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { prisma } from "@/lib/shared/prisma"

type ConfirmedSaveBody = {
  fileName?: string
  pageNo?: number
  rotateDeg?: number
  columns?: number
  rows?: number
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
  assignedSlots?: Array<{
    sourceSlot?: number
    productCode?: string
  }>
  replace?: boolean
}

type ConfirmedSaveMeta = {
  assignedSlots?: Array<{
    sourceSlot?: number
    productCode?: string
  }>
  replace?: boolean
}

function isMultipartRequest(req: Request): boolean {
  const contentType = req.headers.get("content-type") ?? ""
  return contentType.toLowerCase().includes("multipart/form-data")
}

async function parseConfirmedSaveFormData(
  formData: FormData
): Promise<{
  assignedSlots: Array<{
    sourceSlot: number
    productCode: string
    pngBuffer: Buffer
  }>
  replace: boolean
}> {
  const metaRaw = formData.get("meta")
  if (typeof metaRaw !== "string" || !metaRaw.trim()) {
    throw new CatalogImageError("meta is required", "VALIDATION_ERROR", 400)
  }

  let meta: ConfirmedSaveMeta
  try {
    meta = JSON.parse(metaRaw) as ConfirmedSaveMeta
  } catch {
    throw new CatalogImageError("meta must be valid JSON", "VALIDATION_ERROR", 400)
  }

  const assignedSlots = Array.isArray(meta.assignedSlots) ? meta.assignedSlots : []
  if (assignedSlots.length === 0) {
    throw new CatalogImageError(
      "assignedSlots is required",
      "VALIDATION_ERROR",
      400
    )
  }

  const parsedSlots: Array<{
    sourceSlot: number
    productCode: string
    pngBuffer: Buffer
  }> = []

  for (const assigned of assignedSlots) {
    const sourceSlot = Number(assigned.sourceSlot)
    const productCode = String(assigned.productCode ?? "").trim()
    if (!Number.isInteger(sourceSlot) || sourceSlot < 1) {
      throw new CatalogImageError(
        "Invalid source slot number",
        "VALIDATION_ERROR",
        400
      )
    }
    if (!productCode) {
      throw new CatalogImageError("productCode is required", "VALIDATION_ERROR", 400)
    }

    const field = formData.get(`slot-${sourceSlot}`)
    if (!field || typeof field === "string") {
      throw new CatalogImageError(
        `PNG file for slot ${sourceSlot} is required`,
        "VALIDATION_ERROR",
        400
      )
    }

    const pngBuffer = Buffer.from(await field.arrayBuffer())
    if (pngBuffer.length === 0) {
      throw new CatalogImageError(
        `PNG file for slot ${sourceSlot} is empty`,
        "VALIDATION_ERROR",
        400
      )
    }

    parsedSlots.push({ sourceSlot, productCode, pngBuffer })
  }

  return {
    assignedSlots: parsedSlots,
    replace: meta.replace === true,
  }
}

export async function POST(req: Request) {
  try {
    requireCatalogImageSession(await getSession())

    if (isMultipartRequest(req)) {
      const formData = await req.formData()
      const parsed = await parseConfirmedSaveFormData(formData)
      const result = await confirmedSaveCatalogImagesFromBlobs(prisma, parsed)
      return NextResponse.json(result)
    }

    const body = (await req.json()) as ConfirmedSaveBody

    const result = await confirmedSaveCatalogImages(prisma, {
      fileName: String(body.fileName ?? ""),
      pageNo: body.pageNo,
      rotateDeg: body.rotateDeg,
      columns: body.columns,
      rows: body.rows,
      cropX: body.cropX,
      cropY: body.cropY,
      cropWidth: body.cropWidth,
      cropHeight: body.cropHeight,
      assignedSlots: Array.isArray(body.assignedSlots)
        ? body.assignedSlots.map((slot) => ({
            sourceSlot: Number(slot.sourceSlot),
            productCode: String(slot.productCode ?? ""),
          }))
        : [],
      replace: body.replace === true,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "POST catalog-image/confirmed-save error")
  }
}
