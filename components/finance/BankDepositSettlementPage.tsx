"use client"

import { useCallback, useEffect, useState } from "react"
import { BankDepositSettlementTable } from "@/components/finance/BankDepositSettlementTable"
import {
  PayInConfirmModal,
  type PayInConfirmModalRow,
} from "@/components/finance/PayInConfirmModal"
import { PayInSlipPreviewModal } from "@/components/finance/PayInSlipPreviewModal"
import { PosSettlementFilterBar } from "@/components/finance/PosSettlementFilterBar"
import {
  fetchBankDepositSettlementStatusList,
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

function toPayInModalRow(
  row: BankDepositSettlementReconciliation
): PayInConfirmModalRow {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  const branchLabel =
    code && name ? `${code} — ${name}` : code ?? name ?? row.branchId

  return {
    collectorReportId: row.collectorReportId,
    collectNo: row.collectNo,
    branchLabel,
    inTransitAmount: row.inTransitAmount,
    payInEvidenceStatus: row.payInEvidenceStatus,
    payInEvidenceUrl: row.payInEvidenceUrl,
  }
}

export function BankDepositSettlementPage() {
  const [filter, setFilter] = useState<FinanceFilterValues>(defaultDateRange)
  const [items, setItems] = useState<BankDepositSettlementReconciliation[]>([])
  const [loading, setLoading] = useState(false)
  const [payInReportId, setPayInReportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [entityBlocked, setEntityBlocked] = useState(false)
  const [payInRow, setPayInRow] = useState<PayInConfirmModalRow | null>(null)
  const [previewRow, setPreviewRow] =
    useState<BankDepositSettlementReconciliation | null>(null)

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

  function handleOpenPayIn(row: BankDepositSettlementReconciliation) {
    setPayInRow(toPayInModalRow(row))
  }

  async function handlePayInConfirmed() {
    setPayInReportId(payInRow?.collectorReportId ?? null)
    try {
      await load(filter)
    } finally {
      setPayInReportId(null)
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

      {loading && items.length === 0 ? (
        <p className="mt-4 text-zinc-600">Loading bank deposit statuses…</p>
      ) : null}

      <BankDepositSettlementTable
        items={items}
        payInReportId={payInReportId}
        onPayIn={entityBlocked ? undefined : handleOpenPayIn}
        onPreviewPayInSlip={setPreviewRow}
      />

      <PayInConfirmModal
        row={payInRow}
        open={payInRow != null}
        onClose={() => setPayInRow(null)}
        onConfirmed={handlePayInConfirmed}
      />

      <PayInSlipPreviewModal
        open={previewRow != null}
        imageUrl={previewRow?.payInEvidenceUrl ?? null}
        collectNo={previewRow?.collectNo}
        onClose={() => setPreviewRow(null)}
      />
    </div>
  )
}
