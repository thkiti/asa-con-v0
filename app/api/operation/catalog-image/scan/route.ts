import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { getCatalogImageInputDir } from "@/lib/catalog-image/config"
import { catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { listInputPdfFiles } from "@/lib/catalog-image/paths"

export async function GET() {
  try {
    requireCatalogImageSession(await getSession())
    const files = await listInputPdfFiles()
    return NextResponse.json({
      inputDir: getCatalogImageInputDir(),
      files,
    })
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "GET catalog-image/scan error")
  }
}
