import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { resolveCatalogProductImageUrl } from "@/lib/catalog-image/resolve-product-image-url"

/** Same catalog image resolver as POS product lookup (`lookupPosProductByCode`). */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const productCode = String(req.nextUrl.searchParams.get("code") ?? "").trim()
  if (!productCode) {
    return NextResponse.json({ error: "code is required" }, { status: 400 })
  }

  const imageUrl = await resolveCatalogProductImageUrl(productCode)
  return NextResponse.json({ productCode, imageUrl })
}
