import type {
  SalesDashboardDayDetail,
  SalesDashboardView,
} from "@/lib/shop/sales-dashboard-types"
import { parseShopJsonResponse } from "@/lib/shop-ui/shop-fetch-json"

export type SalesDashboardLoadResult =
  | { ok: true; view: SalesDashboardView }
  | { ok: false; status: number; error: string; code?: string }

export type SalesDashboardDayDetailResult =
  | { ok: true; detail: SalesDashboardDayDetail }
  | { ok: false; status: number; error: string; code?: string }

function buildDashboardQuery(input: {
  year: number
  month: number
  branchId?: string
  yearToDate?: boolean
}): string {
  const params = new URLSearchParams({
    year: String(input.year),
    month: String(input.month),
  })
  if (input.branchId) {
    params.set("branchId", input.branchId)
  }
  if (input.yearToDate) {
    params.set("yearToDate", "true")
  }
  return params.toString()
}

export async function fetchSalesDashboard(input: {
  year: number
  month: number
  branchId?: string
  yearToDate?: boolean
}): Promise<SalesDashboardLoadResult> {
  const res = await fetch(
    `/api/shop/sales-dashboard?${buildDashboardQuery(input)}`
  )
  const parsed = await parseShopJsonResponse(res)
  if (!parsed.ok) {
    return {
      ok: false,
      status: parsed.status,
      error: parsed.error,
      code: parsed.code,
    }
  }
  return { ok: true, view: parsed.payload as SalesDashboardView }
}

export async function fetchSalesDashboardDayDetail(input: {
  dateKey: string
  branchId?: string
  saleId?: string
}): Promise<SalesDashboardDayDetailResult> {
  const params = new URLSearchParams({ dateKey: input.dateKey })
  if (input.branchId) params.set("branchId", input.branchId)
  if (input.saleId) params.set("saleId", input.saleId)

  const res = await fetch(`/api/shop/sales-dashboard/day?${params.toString()}`)
  const parsed = await parseShopJsonResponse(res)
  if (!parsed.ok) {
    return {
      ok: false,
      status: parsed.status,
      error: parsed.error,
      code: parsed.code,
    }
  }
  return { ok: true, detail: parsed.payload as SalesDashboardDayDetail }
}
