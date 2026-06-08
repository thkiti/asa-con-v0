import type {
  ThermalDocumentLayoutView,
  ThermalDocumentType,
  ThermalLayoutMap,
  UpdateThermalDocumentLayoutInput,
} from "@/lib/thermal/types"

async function readJsonBody<T>(res: Response): Promise<T> {
  const payload = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(payload.error ?? `Request failed (${res.status})`)
  }
  return payload
}

export function fetchThermalDocumentLayouts(): Promise<{ layouts: ThermalLayoutMap }> {
  return fetch("/api/admin/thermal-layouts", { cache: "no-store" }).then((res) =>
    readJsonBody<{ layouts: ThermalLayoutMap }>(res)
  )
}

export function patchThermalDocumentLayout(
  documentType: ThermalDocumentType,
  input: UpdateThermalDocumentLayoutInput
): Promise<{ layout: ThermalDocumentLayoutView }> {
  return fetch(`/api/admin/thermal-layouts/${documentType}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => readJsonBody<{ layout: ThermalDocumentLayoutView }>(res))
}
