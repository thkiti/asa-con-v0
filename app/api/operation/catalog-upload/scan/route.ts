import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { scanCatalogProductImages } from "@/lib/catalog-upload/scan-local-images"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  try {
    requireCatalogImageSession(await getSession())
    const result = await scanCatalogProductImages(prisma)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "GET catalog-upload/scan error")
  }
}
