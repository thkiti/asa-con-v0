import type { PosTargetVsSalesSummary } from "@/lib/pos/target-vs-sales-types"

export type PosTargetVsSalesLoadResult =
  | { ok: true; summary: PosTargetVsSalesSummary }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchPosTargetVsSales(): Promise<PosTargetVsSalesLoadResult> {
  const res = await fetch("/api/pos/target-vs-sales")
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      status: res.status,
      error: "Server returned a non-JSON response",
    }
  }

  let payload: unknown
  try {
    payload = await res.json()
  } catch {
    return { ok: false, status: res.status, error: "Invalid JSON response" }
  }

  if (!res.ok) {
    const err = payload as { error?: string; code?: string }
    return {
      ok: false,
      status: res.status,
      error: err.error ?? "Request failed",
      code: err.code,
    }
  }

  return { ok: true, summary: payload as PosTargetVsSalesSummary }
}
