import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { searchCollectorLookup } from "@/lib/pos/collector-lookup"
import { prisma } from "@/lib/shared/prisma"
import {
  requireStockDocumentSession,
  resolveListBranchId,
} from "@/lib/stock/document-read/document-access"

export async function GET(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const branchId = resolveListBranchId(
      session,
      req.nextUrl.searchParams.get("branchId")
    )

    const collectNo = req.nextUrl.searchParams.get("collectNo") ?? undefined
    const limitParam = req.nextUrl.searchParams.get("limit")
    const limit = limitParam ? Number(limitParam) : undefined

    const result = await searchCollectorLookup(prisma, {
      branchId,
      collectNo,
      limit,
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/collectors/lookup")
  }
}
