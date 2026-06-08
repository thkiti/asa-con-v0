import type { ResolvedThermalLayout, ThermalDocumentType } from "@/lib/thermal/types"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { resolveThermalLayout } from "@/lib/thermal/layout"

export type PosThermalLayoutsResponse = {
  resolved: Record<ThermalDocumentType, ResolvedThermalLayout>
}

export async function fetchPosThermalLayouts(): Promise<PosThermalLayoutsResponse> {
  const res = await fetch("/api/pos/thermal-layouts", { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Failed to load thermal layouts (${res.status})`)
  }
  return res.json() as Promise<PosThermalLayoutsResponse>
}

export function defaultResolvedThermalLayouts(): Record<
  ThermalDocumentType,
  ResolvedThermalLayout
> {
  return Object.fromEntries(
    (Object.keys(DEFAULT_THERMAL_LAYOUTS) as ThermalDocumentType[]).map((type) => [
      type,
      resolveThermalLayout(type, DEFAULT_THERMAL_LAYOUTS),
    ])
  ) as Record<ThermalDocumentType, ResolvedThermalLayout>
}
