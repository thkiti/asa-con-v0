import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { confirmedSaveCatalogImages } from "@/lib/catalog-image/confirmed-save"
import { catalogImageErrorResponse } from "@/lib/catalog-image/errors"
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

export async function POST(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
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
