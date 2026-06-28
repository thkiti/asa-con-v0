"use client"

import { useCallback, useEffect, useState } from "react"
import { BankDepositSettlementTable } from "@/components/finance/BankDepositSettlementTable"
import { PosSettlementFilterBar } from "@/components/finance/PosSettlementFilterBar"
import {
  fetchBankDepositSettlementStatusList,
  formatBankDepositPostError,
  postBankDepositSettlement,
  type BankDepositSettlementReconciliation,
} from "@/lib/finance-ui/bank-deposit-settlement"
import { fetchManualJournalSessionContext } from "@/lib/finance-ui/manual-journal-entry-session"
import type { FinanceFilterValues } from "@/lib/finance-ui/types"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"

function defaultDateRange(): FinanceFilterValues {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const toYmd = (date: Date) => date.toISOString().slice(0, 10)
  return { from: toYmd(start), to: toYmd(end) }
}

export function BankDepositSettlementPage() {
  const [filter, setFilter] = useState<FinanceFilterValues>(defaultDateRange)
  const [items, setItems] = useState<BankDepositSettlementReconciliation[]>([])
  const [loading, setLoading] = useState(false)
  const [postingReportId, setPostingReportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [postError, setPostError] = useState<string | null>(null)
  const [entityBlocked, setEntityBlocked] = useState(false)

  const load = useCallback(async (values: FinanceFilterValues) => {
    if (!values.from?.trim() || !values.to?.trim()) {
      setError("From and to dates are required")
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchBankDepositSettlementStatusList(values)
      setItems(result.items)
    } catch (err) {
      setItems([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchManualJournalSessionContext().then((session) => {
      if (!session) return
      setEntityBlocked(session.documentEntityCode !== DEFAULT_DOCUMENT_ENTITY_CODE)
    })
  }, [])

  async function handleApply() {
    await load(filter)
  }

  async function handlePost(collectorReportId: string) {
    setPostingReportId(collectorReportId)
    setPostError(null)
    try {
      await postBankDepositSettlement(collectorReportId)
      await load(filter)
    } catch (err) {
      setPostError(formatBankDepositPostError(err))
    } finally {
      setPostingReportId(null)
    }
  }

  return (
    <div>
      {entityBlocked ? (
        <p
          className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="bank-deposit-entity-blocked"
        >
          POS bank deposit settlement is available for AS / ASAS sessions only.
          Switch document entity to AS to post settlements.
        </p>
      ) : null}

      <PosSettlementFilterBar
        values={filter}
        onChange={setFilter}
        onApply={handleApply}
        loading={loading}
      />

      {error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {postError ? (
        <p
          className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          data-testid="bank-deposit-post-error"
        >
          {postError}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="mt-4 text-zinc-600">Loading bank deposit statuses…</p>
      ) : null}

      <BankDepositSettlementTable
        items={items}
        postingReportId={postingReportId}
        onPost={entityBlocked ? undefined : handlePost}
      />
    </div>
  )
}
