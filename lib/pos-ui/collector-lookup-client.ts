import type { CollectorLookupResult } from "@/lib/pos/collector-lookup-types"

export type CollectorLookupSearchParams = {
  branchId: string
  collectNo?: string
}

export type CollectorLookupFetchResult =
  | { ok: true; result: CollectorLookupResult }
  | { ok: false; error: string }

export async function fetchCollectorLookup(
  params: CollectorLookupSearchParams
): Promise<CollectorLookupFetchResult> {
  const search = new URLSearchParams({ branchId: params.branchId.trim() })
  if (params.collectNo?.trim()) {
    search.set("collectNo", params.collectNo.trim())
  }

  const res = await fetch(`/api/pos/collectors/lookup?${search.toString()}`)
  const body = (await res.json().catch(() => ({}))) as {
    error?: string
    collectors?: CollectorLookupResult["collectors"]
  }

  if (!res.ok) {
    return { ok: false, error: body.error ?? "Collector lookup failed" }
  }

  return { ok: true, result: { collectors: body.collectors ?? [] } }
}

export function openCollectorArchivePdf(collectorReportId: string, branchId: string): void {
  const url = `/api/pos/collectors/${encodeURIComponent(collectorReportId)}/pdf?disposition=inline&branchId=${encodeURIComponent(branchId)}`
  window.open(url, "_blank", "noopener,noreferrer")
}

export function printCollectorArchivePdf(collectorReportId: string, branchId: string): void {
  const url = `/api/pos/collectors/${encodeURIComponent(collectorReportId)}/pdf?disposition=inline&branchId=${encodeURIComponent(branchId)}`
  const frame = document.createElement("iframe")
  frame.style.display = "none"
  frame.src = url
  document.body.appendChild(frame)
  frame.onload = () => {
    frame.contentWindow?.print()
  }
}
