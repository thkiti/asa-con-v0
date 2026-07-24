"use client"

/**
 * Load AccountingPeriod rows for the active legal entity without URL sync.
 * Use when the page already owns periodKey state / draft filters / custom URL keys.
 * Prefer `useFinancePeriodFilter` when the page should own `?periodKey=` authority.
 */

import { useEffect, useState } from "react"
import {
  FINANCE_PERIOD_FILTER_EMPTY_MESSAGE,
  sortAccountingPeriodsDesc,
} from "@/lib/finance-ui/accounting-period-filter"
import { fetchAccountingPeriodsForEntity } from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"

export function useAccountingPeriodOptions() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const [periods, setPeriods] = useState<AccountingPeriodRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Reset loading for entity changes (same pattern as useFinancePeriodFilter).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch bootstrap
    setLoading(true)
    setLoadError(null)

    void fetchAccountingPeriodsForEntity(legalEntityCode)
      .then((result) => {
        if (cancelled) return
        setPeriods(sortAccountingPeriodsDesc(result.periods))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPeriods([])
        setLoadError(
          err instanceof Error ? err.message : "Failed to load accounting periods"
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [legalEntityCode])

  return {
    legalEntityCode,
    periods,
    loading,
    loadError,
    hasPeriods: periods.length > 0,
    emptyMessage: FINANCE_PERIOD_FILTER_EMPTY_MESSAGE,
  }
}
