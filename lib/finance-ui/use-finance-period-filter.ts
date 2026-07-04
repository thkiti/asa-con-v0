"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  buildFinanceScopeSearchParams,
  FINANCE_PERIOD_FILTER_EMPTY_MESSAGE,
  readPeriodKeyFromSearchParams,
  resolveFinancePeriodFilterKey,
  sortAccountingPeriodsDesc,
} from "@/lib/finance-ui/accounting-period-filter"
import { fetchAccountingPeriodsForEntity } from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"

export function useFinancePeriodFilter() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [periods, setPeriods] = useState<AccountingPeriodRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const urlPeriodKey = useMemo(
    () => readPeriodKeyFromSearchParams(searchParams),
    [searchParams]
  )

  useEffect(() => {
    let cancelled = false
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
        setLoadError(err instanceof Error ? err.message : "Failed to load accounting periods")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [legalEntityCode])

  const periodKey = useMemo(
    () => resolveFinancePeriodFilterKey({ periods, urlPeriodKey }),
    [periods, urlPeriodKey]
  )

  useEffect(() => {
    if (loading || !periodKey) return
    if (urlPeriodKey === periodKey) return

    const params = buildFinanceScopeSearchParams({
      searchParams,
      legalEntityCode,
      periodKey,
    })
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [legalEntityCode, loading, pathname, periodKey, router, searchParams, urlPeriodKey])

  const setPeriodKey = useCallback(
    (nextPeriodKey: string) => {
      const params = buildFinanceScopeSearchParams({
        searchParams,
        legalEntityCode,
        periodKey: nextPeriodKey,
      })
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [legalEntityCode, pathname, router, searchParams]
  )

  return {
    legalEntityCode,
    periodKey,
    setPeriodKey,
    periods,
    loading,
    loadError,
    hasPeriods: periods.length > 0,
    emptyMessage: FINANCE_PERIOD_FILTER_EMPTY_MESSAGE,
  }
}
