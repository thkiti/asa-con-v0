import fs from "fs/promises"
import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { CatalogImageError, catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { resolveWorkPreviewPath } from "@/lib/catalog-image/paths"

export async function GET(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
    const url = new URL(req.url)
    const batchId = url.searchParams.get("batchId") ?? ""
    const pageNo = Number(url.searchParams.get("pageNo"))
    const slotNo = Number(url.searchParams.get("slotNo"))

    const filePath = resolveWorkPreviewPath(batchId, pageNo, slotNo)
    try {
      await fs.access(filePath)
    } catch {
      throw new CatalogImageError("Preview not found", "FILE_NOT_FOUND", 404)
    }

    const buffer = await fs.readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "GET catalog-image/preview error")
  }
}
