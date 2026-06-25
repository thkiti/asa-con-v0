import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { parsePatchProductBody, patchProduct } from "@/lib/master"
import { requireProductReferenceSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

type RouteContext = { params: Promise<{ productId: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    requireProductReferenceSession(await getSession())
    const { productId } = await context.params
    const body = parsePatchProductBody(await req.json())
    const item = await patchProduct(prisma, productId, body)
    return NextResponse.json({ item })
  } catch (err: unknown) {
    return masterErrorResponse(err, "PATCH /api/master/products/[productId]")
  }
}
