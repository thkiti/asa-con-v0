import type { SalesTargetBranchOption } from "@/lib/shop/sales-target-types"

export type ParsedShopJsonResult =
  | { ok: true; payload: unknown; status: number }
  | { ok: false; status: number; error: string; code?: string }

export async function parseShopJsonResponse(
  res: Response
): Promise<ParsedShopJsonResult> {
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
    return {
      ok: false,
      status: res.status,
      error: "Invalid JSON response",
    }
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

  return { ok: true, payload, status: res.status }
}

export function requireBranchesArray(
  payload: unknown
): SalesTargetBranchOption[] | null {
  if (
    payload === null ||
    typeof payload !== "object" ||
    !("branches" in payload) ||
    !Array.isArray((payload as { branches: unknown }).branches)
  ) {
    return null
  }
  return (payload as { branches: SalesTargetBranchOption[] }).branches
}
