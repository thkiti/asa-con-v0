"use client"

import { useCallback, useEffect, useState } from "react"
import { CollectorPickupSettlementTable } from "@/components/finance/CollectorPickupSettlementTable"
import { PosSettlementFilterBar } from "@/components/finance/PosSettlementFilterBar"
import {
  fetchCollectorPickupSettlementStatusList,
  formatCollectorPickupPostError,
  postCollectorPickupSettlement,
  type CollectorPickupSettlementReconciliation,
} from "@/lib/finance-ui/collector-pickup-settlement"
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

export function CollectorPickupSettlementPage() {
  const [filter, setFilter] = useState<FinanceFilterValues>(defaultDateRange)
  const [items, setItems] = useState<CollectorPickupSettlementReconciliation[]>([])
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
      const result = await fetchCollectorPickupSettlementStatusList(values)
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
      await postCollectorPickupSettlement(collectorReportId)
      await load(filter)
    } catch (err) {
      setPostError(formatCollectorPickupPostError(err))
    } finally {
      setPostingReportId(null)
    }
  }

  return (
    <div>
      {entityBlocked ? (
        <p
          className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="collector-pickup-entity-blocked"
        >
          POS collector pickup settlement is available for AS / ASAS sessions only.
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
          data-testid="collector-pickup-post-error"
        >
          {postError}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="mt-4 text-zinc-600">Loading collector pickup statuses…</p>
      ) : null}

      <CollectorPickupSettlementTable
        items={items}
        postingReportId={postingReportId}
        onPost={entityBlocked ? undefined : handlePost}
      />
    </div>
  )
}
