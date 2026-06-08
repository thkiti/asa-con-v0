import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import type { ThermalDocumentType, ResolvedThermalLayout } from "@/lib/thermal/types"

export function mockResolvedThermalLayouts(): Record<
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

export function mockThermalLayoutsFetchResponse() {
  const resolved = mockResolvedThermalLayouts()
  return {
    ok: true,
    status: 200,
    json: async () => ({ layouts: DEFAULT_THERMAL_LAYOUTS, resolved }),
  } as Response
}
