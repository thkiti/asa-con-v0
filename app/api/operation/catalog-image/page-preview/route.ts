import fs from "fs/promises"
import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { renderCatalogPagePreview } from "@/lib/catalog-image/page-preview"
import { parsePageNo } from "@/lib/catalog-image/parse-page-no"
import { resolveInputPdfPath } from "@/lib/catalog-image/paths"

export async function GET(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
    const url = new URL(req.url)
    const fileName = String(url.searchParams.get("fileName") ?? "").trim()
    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const rotateDeg = Number(url.searchParams.get("rotateDeg") ?? 180)
    const pageNo = parsePageNo(url.searchParams.get("pageNo"), 1)
    const pdfPath = resolveInputPdfPath(fileName)
    try {
      await fs.access(pdfPath)
    } catch {
      return NextResponse.json(
        { error: "PDF file not found", code: "FILE_NOT_FOUND" },
        { status: 404 }
      )
    }

    const buffer = await renderCatalogPagePreview(pdfPath, rotateDeg, pageNo)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "GET catalog-image/page-preview error")
  }
}
