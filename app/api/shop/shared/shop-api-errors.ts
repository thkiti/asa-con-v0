import { SalesDashboardAuthError } from "@/lib/permissions/sales-dashboard"
import { SalesTargetAuthError } from "@/lib/permissions/sales-targets"
import { SalesDashboardError } from "@/lib/shop/sales-dashboard-errors"
import { SalesTargetError } from "@/lib/shop/sales-target-errors"
import { NextResponse } from "next/server"

export function shopApiErrorResponse(err: unknown, logLabel: string): NextResponse {
  console.error(logLabel, err)

  if (err instanceof SalesDashboardAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof SalesTargetAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof SalesDashboardError) {
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

function parseDashboardParams(
  searchParams: URLSearchParams
): { year: number; month: number; branchId?: string } {
  const year = Number(searchParams.get("year") ?? "")
  const month = Number(searchParams.get("month") ?? "")
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new SalesDashboardError(
      "year and month are required",
      "INVALID_QUERY",
      400
    )
  }
  const branchId = String(searchParams.get("branchId") ?? "").trim()
  return branchId ? { year, month, branchId } : { year, month }
}

function parseDayDetailParams(searchParams: URLSearchParams): {
  dateKey: string
  branchId?: string
  saleId?: string
} {
  const dateKey = String(searchParams.get("dateKey") ?? "").trim()
  if (!dateKey) {
    throw new SalesDashboardError("dateKey is required", "INVALID_QUERY", 400)
  }
  const branchId = String(searchParams.get("branchId") ?? "").trim()
  const saleId = String(searchParams.get("saleId") ?? "").trim()
  return {
    dateKey,
    ...(branchId ? { branchId } : {}),
    ...(saleId ? { saleId } : {}),
  }
}

export { parseYearMonthParams, parseDashboardParams, parseDayDetailParams }
