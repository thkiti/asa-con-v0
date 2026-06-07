import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { saveMatchedCatalogImages } from "@/lib/catalog-image/save-matched"
import { prisma } from "@/lib/shared/prisma"

type SaveMatchedBody = {
  items?: Array<{
    productCode?: string
    localFilePath?: string
    replace?: boolean
  }>
}

export async function POST(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
    const body = (await req.json()) as SaveMatchedBody
    const items = Array.isArray(body.items) ? body.items : []

    const results = await saveMatchedCatalogImages(
      prisma,
      items.map((item) => ({
        productCode: String(item.productCode ?? ""),
        localFilePath: String(item.localFilePath ?? ""),
        replace: item.replace === true,
      }))
    )

    return NextResponse.json({ items: results })
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "POST catalog-image/save-matched error")
  }
}
