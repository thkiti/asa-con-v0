import { bangkokCalendarYmd, readZMonthStartYmd } from "@/lib/pos/bangkokDayBounds"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ThermalSlipInfoBlockRow } from "@/lib/thermal/thermal-slip-info-block"

/** DD/MM/YYYY for thermal READ Z period labels. */
export function formatReadZBangkokDisplayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-")
  if (!y || !m || !d) return ymd
  return `${d}/${m}/${y}`
}

export function buildReadZSlipInfoBlock(
  report: ReadReportPayload,
  todayYmd: string = bangkokCalendarYmd(new Date())
): ThermalSlipInfoBlockRow[] {
  if (report.mode !== "Z") return []

  if (report.readZScope === "cumulative-to-date") {
    const periodEnd = report.bangkokDateTo ?? report.readZViewDate ?? todayYmd
    const periodStart = report.bangkokDateFrom ?? readZMonthStartYmd(periodEnd)
    return [
      { kind: "label-value", label: "Report:", value: "Cumulative To-Date" },
      {
        kind: "label-value",
        label: "Period:",
        value: `${formatReadZBangkokDisplayYmd(periodStart)} - ${formatReadZBangkokDisplayYmd(periodEnd)}`,
      },
      { kind: "blank" },
    ]
  }

  const viewDate = report.readZViewDate ?? report.bangkokDate
  if (report.readZScope === "daily" && viewDate) {
    const showBusinessDate =
      report.readZReview === true || viewDate !== todayYmd
    if (showBusinessDate) {
      return [
        {
          kind: "label-value",
          label: "Business date:",
          value: formatReadZBangkokDisplayYmd(viewDate),
        },
        { kind: "blank" },
      ]
    }
  }

  return []
}
