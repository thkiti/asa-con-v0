"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { BankStatementStatus } from "@/lib/finance/bank-statement/bank-statement-types"
import {
  buildFinanceScopeSearchParams,
  FINANCE_PERIOD_FILTER_EMPTY_MESSAGE,
  isAccountingPeriodKeyInList,
  readPeriodKeyFromSearchParams,
  sortAccountingPeriodsDesc,
} from "@/lib/finance-ui/accounting-period-filter"
import {
  buildBankCashCheckStatementStatusByPeriod,
  pickFirstAccountingPeriodKey,
  resolveBankCashCheckPeriodFilterKey,
} from "@/lib/finance-ui/bank-cash-period-default"
import { fetchBankStatements } from "@/lib/finance-ui/bank-statements"
import { fetchAccountingPeriodsForEntity } from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"

export function useBankCashCheckPeriodFilter(bankAccountId: string) {
  const legalEntityCode = useFinanceLegalEntityScope()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [periods, setPeriods] = useState<AccountingPeriodRow[]>([])
  const [periodsLoading, setPeriodsLoading] = useState(true)
  const [periodsError, setPeriodsError] = useState<string | null>(null)
  const [statementsLoading, setStatementsLoading] = useState(false)

  const urlPeriodKey = useMemo(
    () => readPeriodKeyFromSearchParams(searchParams),
    [searchParams]
  )

  const [statementStatusByPeriodKey, setStatementStatusByPeriodKey] = useState(
    () => new Map<string, BankStatementStatus>()
  )

  useEffect(() => {
    let cancelled = false
    setPeriodsLoading(true)
    setPeriodsError(null)

    void fetchAccountingPeriodsForEntity(legalEntityCode)
      .then((result) => {
        if (cancelled) return
        setPeriods(sortAccountingPeriodsDesc(result.periods))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPeriods([])
        setPeriodsError(err instanceof Error ? err.message : "Failed to load accounting periods")
      })
      .finally(() => {
        if (!cancelled) setPeriodsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [legalEntityCode])

  useEffect(() => {
    if (!bankAccountId) {
      setStatementStatusByPeriodKey(new Map())
      setStatementsLoading(false)
      return
    }

    let cancelled = false
    setStatementsLoading(true)

    void fetchBankStatements(legalEntityCode, { bankAccountId })
      .then((result) => {
        if (cancelled) return
        setStatementStatusByPeriodKey(buildBankCashCheckStatementStatusByPeriod(result.items))
      })
      .catch(() => {
        if (cancelled) return
        setStatementStatusByPeriodKey(new Map())
      })
      .finally(() => {
        if (!cancelled) setStatementsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [bankAccountId, legalEntityCode])

  const waitingForActionableDefault =
    !urlPeriodKey && Boolean(bankAccountId) && statementsLoading

  const { periodKey, allPeriodsCompleted } = useMemo(() => {
    if (waitingForActionableDefault) {
      return { periodKey: null, allPeriodsCompleted: false }
    }

    if (!bankAccountId) {
      if (urlPeriodKey && isAccountingPeriodKeyInList(urlPeriodKey, periods)) {
        return { periodKey: urlPeriodKey, allPeriodsCompleted: false }
      }
      return {
        periodKey: pickFirstAccountingPeriodKey(periods),
        allPeriodsCompleted: false,
      }
    }

    return resolveBankCashCheckPeriodFilterKey({
      periods,
      urlPeriodKey,
      statementStatusByPeriodKey,
    })
  }, [
    bankAccountId,
    periods,
    statementStatusByPeriodKey,
    urlPeriodKey,
    waitingForActionableDefault,
  ])

  const canSyncResolvedPeriod = Boolean(bankAccountId) || Boolean(urlPeriodKey)

  useEffect(() => {
    if (periodsLoading || waitingForActionableDefault || !periodKey) return
    if (!canSyncResolvedPeriod) return
    if (urlPeriodKey === periodKey) return

    const params = buildFinanceScopeSearchParams({
      searchParams,
      legalEntityCode,
      periodKey,
    })
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [
    legalEntityCode,
    pathname,
    periodKey,
    periodsLoading,
    router,
    searchParams,
    urlPeriodKey,
    waitingForActionableDefault,
    canSyncResolvedPeriod,
  ])

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
    loading: periodsLoading || waitingForActionableDefault,
    loadError: periodsError,
    hasPeriods: periods.length > 0,
    emptyMessage: FINANCE_PERIOD_FILTER_EMPTY_MESSAGE,
    allPeriodsCompleted,
  }
}
