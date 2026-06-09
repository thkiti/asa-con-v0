import type { CheckReceiptResult } from "@/lib/operations/check-receipt-types"

export type CheckReceiptLoadResult =
  | { ok: true; result: CheckReceiptResult }
  | { ok: false; status: number; error: string; code?: string }

async function parseJsonResponse(
  res: Response
): Promise<
  | { ok: true; payload: unknown }
  | { ok: false; status: number; error: string; code?: string }
> {
  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  if (!res.ok) {
    const body = payload as { error?: string; code?: string } | null
    return {
      ok: false,
      status: res.status,
      error: body?.error ?? `Request failed (${res.status})`,
      code: body?.code,
    }
  }

  return { ok: true, payload }
}

export async function fetchCheckReceipt(input: {
  branchId: string
  year: number
  month: number
}): Promise<CheckReceiptLoadResult> {
  const params = new URLSearchParams({
    branchId: input.branchId,
    year: String(input.year),
    month: String(input.month),
  })
  const res = await fetch(`/api/operation/check-receipt?${params.toString()}`)
  const parsed = await parseJsonResponse(res)
  if (!parsed.ok) {
    return parsed
  }
  return { ok: true, result: parsed.payload as CheckReceiptResult }
}
