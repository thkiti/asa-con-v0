import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { resolveCollectorDefaultDates } from "@/lib/pos/collector-default-dates"
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

    const dates = await resolveCollectorDefaultDates(prisma, branchId)
    return NextResponse.json(dates)
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/collect-report/default-dates")
  }
}
