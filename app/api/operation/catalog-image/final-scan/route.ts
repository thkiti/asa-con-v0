import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { getCatalogImageFinalDir } from "@/lib/catalog-image/config"
import { catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { listFinalWorkFiles } from "@/lib/catalog-image/paths"

export async function GET() {
  try {
    requireCatalogImageSession(await getSession())
    const files = await listFinalWorkFiles()
    return NextResponse.json({
      finalDir: getCatalogImageFinalDir(),
      files,
    })
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "GET catalog-image/final-scan error")
  }
}
