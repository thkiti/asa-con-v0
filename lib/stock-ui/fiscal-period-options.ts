export type FiscalPeriodOption = {
  value: string
  label: string
}

/** Fiscal calendar months for a year — value is YYYY-MM, label is `YYYY • MM`. */
export function buildFiscalPeriodOptions(fiscalYear?: number): FiscalPeriodOption[] {
  const year = fiscalYear ?? new Date().getFullYear()
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0")
    return {
      value: `${year}-${month}`,
      label: `${year} • ${month}`,
    }
  })
}

export function formatFiscalPeriodLabel(periodMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periodMonth.trim())
  if (!match) return periodMonth
  return `${match[1]} • ${match[2]}`
}
