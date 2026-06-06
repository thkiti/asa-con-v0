import type {
  BranchSalesTargetView,
  DailyTargetSplit,
  SalesTargetBranchOption,
} from "@/lib/shop/sales-target-types"
import { previousCalendarMonth } from "@/lib/reporting/bangkok-calendar"
import {
  parseShopJsonResponse,
  requireBranchesArray,
} from "@/lib/shop-ui/shop-fetch-json"

export type SalesTargetBranchesResult =
  | { ok: true; branches: SalesTargetBranchOption[] }
  | { ok: false; status: number; error: string; code?: string }

export type SalesTargetLoadResult =
  | { ok: true; target: BranchSalesTargetView }
  | { ok: false; status: number; error: string; code?: string }

export type SalesTargetSaveResult =
  | { ok: true; target: BranchSalesTargetView }
  | { ok: false; status: number; error: string; code?: string }

export type SalesTargetPreviewResult =
  | {
      ok: true
      days: DailyTargetSplit[]
      dailySum: string
      monthlyTotal: string
    }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchSalesTargetBranches(): Promise<SalesTargetBranchesResult> {
  const res = await fetch("/api/shop/sales-targets/branches")
  const parsed = await parseShopJsonResponse(res)
  if (!parsed.ok) {
    return {
      ok: false,
      status: parsed.status,
      error: parsed.error,
      code: parsed.code,
    }
  }

  const branches = requireBranchesArray(parsed.payload)
  if (branches === null) {
    return {
      ok: false,
      status: parsed.status,
      error: "Invalid branches response",
      code: "INVALID_BRANCHES_RESPONSE",
    }
  }

  return { ok: true, branches }
}

export async function fetchSalesTarget(input: {
  branchId: string
  year: number
  month: number
}): Promise<SalesTargetLoadResult> {
  const qs = new URLSearchParams({
    branchId: input.branchId,
    year: String(input.year),
    month: String(input.month),
  })
  const res = await fetch(`/api/shop/sales-targets?${qs}`)
  const parsed = await parseShopJsonResponse(res)
  if (!parsed.ok) {
    return {
      ok: false,
      status: parsed.status,
      error: parsed.error,
      code: parsed.code,
    }
  }
  return { ok: true, target: parsed.payload as BranchSalesTargetView }
}

/** Load previous month for Copy Previous Month — does not save. */
export async function fetchPreviousMonthSalesTarget(input: {
  branchId: string
  year: number
  month: number
}): Promise<SalesTargetLoadResult> {
  const prev = previousCalendarMonth(input.year, input.month)
  return fetchSalesTarget({
    branchId: input.branchId,
    year: prev.year,
    month: prev.month,
  })
}

export async function saveSalesTarget(input: {
  branchId: string
  year: number
  month: number
  monthlyTotal: string
  weekPattern: number[]
}): Promise<SalesTargetSaveResult> {
  const res = await fetch("/api/shop/sales-targets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const parsed = await parseShopJsonResponse(res)
  if (!parsed.ok) {
    return {
      ok: false,
      status: parsed.status,
      error: parsed.error,
      code: parsed.code,
    }
  }
  return { ok: true, target: parsed.payload as BranchSalesTargetView }
}

export async function fetchSalesTargetPreview(input: {
  year: number
  month: number
  monthlyTotal: string
  weekPattern: number[]
}): Promise<SalesTargetPreviewResult> {
  const qs = new URLSearchParams({
    year: String(input.year),
    month: String(input.month),
    monthlyTotal: input.monthlyTotal,
    weekPattern: JSON.stringify(input.weekPattern),
  })
  const res = await fetch(`/api/shop/sales-targets/preview?${qs}`)
  const parsed = await parseShopJsonResponse(res)
  if (!parsed.ok) {
    return {
      ok: false,
      status: parsed.status,
      error: parsed.error,
      code: parsed.code,
    }
  }
  const payload = parsed.payload as {
    days?: DailyTargetSplit[]
    dailySum?: string
    monthlyTotal?: string
  }
  return {
    ok: true,
    days: payload.days ?? [],
    dailySum: payload.dailySum ?? "0.00",
    monthlyTotal: payload.monthlyTotal ?? "0.00",
  }
}
