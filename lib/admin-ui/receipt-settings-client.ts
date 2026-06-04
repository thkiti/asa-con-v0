import type { ReceiptPrintSettingsView } from "@/lib/receipt-settings/types"

function isJsonResponse(res: Response): boolean {
  const contentType = res.headers.get("content-type") ?? ""
  return contentType.includes("application/json")
}

async function readJsonBody<T>(res: Response): Promise<T> {
  if (!isJsonResponse(res)) {
    throw new Error(
      res.ok
        ? "Server returned a non-JSON response. Try signing in again or contact support."
        : `Request failed (${res.status}). Try signing in again.`
    )
  }
  return res.json() as Promise<T>
}

async function throwSettingsError(res: Response): Promise<never> {
  let message = res.statusText || "Request failed"
  if (isJsonResponse(res)) {
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // keep statusText
    }
  } else if (res.status === 401 || res.status === 403) {
    message = "Not authorized to change receipt settings"
  }
  throw new Error(message)
}

export function fetchReceiptPrintSettings(): Promise<{ settings: ReceiptPrintSettingsView }> {
  return fetch("/api/admin/receipt-settings", { cache: "no-store" }).then(async (res) => {
    if (!res.ok) return throwSettingsError(res)
    return readJsonBody<{ settings: ReceiptPrintSettingsView }>(res)
  })
}

export function patchReceiptPrintSettings(
  input: ReceiptPrintSettingsView
): Promise<{ settings: ReceiptPrintSettingsView }> {
  return fetch("/api/admin/receipt-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(async (res) => {
    if (!res.ok) return throwSettingsError(res)
    return readJsonBody<{ settings: ReceiptPrintSettingsView }>(res)
  })
}
