import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { cleanGroupDisplayName } from "@/lib/master/build-product-group"
import { loadProductByCode } from "@/lib/master/load-product-by-code"
import { requireProductReferenceSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireProductReferenceSession(await getSession())
    const code = String(req.nextUrl.searchParams.get("code") || "").trim()
    const product = await loadProductByCode(prisma, code)
    return NextResponse.json({
      product: {
        code: product.code,
        name: cleanGroupDisplayName(product.name),
      },
    })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/products/by-code")
  }
}
