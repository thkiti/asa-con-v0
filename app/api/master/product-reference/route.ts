import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  createReferenceStock,
  listProductReference,
  parseCreateReferenceStockBody,
  parseProductReferenceListQuery,
} from "@/lib/master"
import { requireProductReferenceSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireProductReferenceSession(await getSession())
    const query = parseProductReferenceListQuery(req.nextUrl.searchParams)
    const items = await listProductReference(prisma, query)
    return NextResponse.json({ items })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/product-reference")
  }
}

export async function POST(req: NextRequest) {
  try {
    requireProductReferenceSession(await getSession())
    const body = parseCreateReferenceStockBody(await req.json())
    const item = await createReferenceStock(prisma, body)
    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    return masterErrorResponse(err, "POST /api/master/product-reference")
  }
}
