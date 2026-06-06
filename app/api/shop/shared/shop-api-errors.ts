import { SalesTargetAuthError } from "@/lib/permissions/sales-targets"
import { SalesTargetError } from "@/lib/shop/sales-target-errors"
import { NextResponse } from "next/server"

export function shopApiErrorResponse(err: unknown, logLabel: string): NextResponse {
  console.error(logLabel, err)

  if (err instanceof SalesTargetAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof SalesTargetError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  return NextResponse.json(
    {
      error: err instanceof Error ? err.message : "Shop request failed",
      code: "SHOP_ERROR",
    },
    { status: 500 }
  )
}

function parseYearMonthParams(
  searchParams: URLSearchParams
): { branchId: string; year: number; month: number } {
  const branchId = String(searchParams.get("branchId") ?? "").trim()
  const year = Number(searchParams.get("year") ?? "")
  const month = Number(searchParams.get("month") ?? "")
  if (!branchId || !Number.isFinite(year) || !Number.isFinite(month)) {
    throw new SalesTargetError(
      "branchId, year, and month are required",
      "INVALID_QUERY",
      400
    )
  }
  return { branchId, year, month }
}

export { parseYearMonthParams }
