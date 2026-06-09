import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { listCheckReceiptRows } from "@/lib/operations/check-receipt"
import { CheckReceiptError } from "@/lib/operations/check-receipt-errors"
import { operationApiErrorResponse } from "@/lib/operations/operation-api-errors"
import { requireCheckReceiptSession } from "@/lib/permissions/check-receipt"
import { prisma } from "@/lib/shared/prisma"

function parseCheckReceiptParams(searchParams: URLSearchParams): {
  branchId: string
  year: number
  month: number
} {
  const branchId = String(searchParams.get("branchId") ?? "").trim()
  const year = Number(searchParams.get("year") ?? "")
  const month = Number(searchParams.get("month") ?? "")
  if (!branchId || !Number.isFinite(year) || !Number.isFinite(month)) {
    throw new CheckReceiptError(
      "branchId, year, and month are required",
      "INVALID_QUERY",
      400
    )
  }
  return { branchId, year, month }
}

export async function GET(req: NextRequest) {
  try {
    requireCheckReceiptSession(await getSession())
    const params = parseCheckReceiptParams(req.nextUrl.searchParams)
    const result = await listCheckReceiptRows(prisma, params)
    return NextResponse.json(result)
  } catch (err: unknown) {
    return operationApiErrorResponse(err, "GET /api/operation/check-receipt")
  }
}
