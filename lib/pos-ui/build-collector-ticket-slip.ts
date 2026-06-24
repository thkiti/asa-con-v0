import { buildCollectorSlipText } from "@/lib/thermal/build-collector-slip"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

/** @deprecated Import from @/lib/thermal/build-collector-slip */
export function buildCollectorTicketSlipText(
  report: ReadReportPayload,
  layout?: ResolvedThermalLayout
): string {
  const resolved =
    layout ?? resolveThermalLayout("COLLECTOR", DEFAULT_THERMAL_LAYOUTS)
  return buildCollectorSlipText(report, resolved)
}
