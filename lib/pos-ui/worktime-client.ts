import type { PosWorktimeView } from "@/lib/pos/worktime-types"

export type PosWorktimeLoadResult =
  | { ok: true; view: PosWorktimeView }
  | { ok: false; status: number; error: string; code?: string }

async function parsePosWorktimeJson(res: Response): Promise<PosWorktimeLoadResult> {
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

  return { ok: true, view: payload as PosWorktimeView }
}

export async function fetchPosWorktime(): Promise<PosWorktimeLoadResult> {
  const res = await fetch("/api/pos/worktime")
  return parsePosWorktimeJson(res)
}

export async function postPosWorktimeIn(): Promise<PosWorktimeLoadResult> {
  const res = await fetch("/api/pos/worktime/in", { method: "POST" })
  return parsePosWorktimeJson(res)
}

export async function postPosWorktimeOut(): Promise<PosWorktimeLoadResult> {
  const res = await fetch("/api/pos/worktime/out", { method: "POST" })
  return parsePosWorktimeJson(res)
}
