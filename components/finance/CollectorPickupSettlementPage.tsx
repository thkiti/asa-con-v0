"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CollectorPickupSettlementDetailModal } from "@/components/finance/CollectorPickupSettlementDetailModal"
import { CollectorPickupSettlementTable } from "@/components/finance/CollectorPickupSettlementTable"
import {
  PayInSlipUploadModal,
  type PayInSlipUploadModalRow,
} from "@/components/finance/PayInSlipUploadModal"
import { PayInSlipPreviewModal } from "@/components/finance/PayInSlipPreviewModal"
import {
  PayInStaffCredentialGate,
  type PayInVerifiedStaff,
} from "@/components/finance/PayInStaffCredentialGate"
import { PosSettlementFilterBar } from "@/components/finance/PosSettlementFilterBar"
import {
  buildCollectorPickupSettlementReturnPath,
  fetchCollectorPickupSettlementStatusList,
  formatCollectorPickupPostError,
  parseCollectorPickupSettlementFilterFromSearchParams,
  postCollectorPickupSettlement,
  type CollectorPickupSettlementReconciliation,
} from "@/lib/finance-ui/collector-pickup-settlement"
import {
  formatPayInConfirmError,
  postDepositSettlement,
} from "@/lib/finance-ui/pay-in-settlement"
import { isPayInSlipUploaded } from "@/lib/finance-ui/collector-pickup-settlement-display"
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

function toUploadModalRow(
  row: CollectorPickupSettlementReconciliation
): PayInSlipUploadModalRow {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  const branchLabel =
    code && name ? `${code} — ${name}` : code ?? name ?? row.branchId

  return {
    collectorReportId: row.collectorReportId,
    collectNo: row.collectNo,
    branchLabel,
  }
}

export function CollectorPickupSettlementPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialFilter = useMemo(
    () =>
      parseCollectorPickupSettlementFilterFromSearchParams(searchParams) ??
      defaultDateRange(),
    [searchParams]
  )

  const [filter, setFilter] = useState<FinanceFilterValues>(initialFilter)
  const [items, setItems] = useState<CollectorPickupSettlementReconciliation[]>([])
  const [loading, setLoading] = useState(false)
  const [depositPostingReportId, setDepositPostingReportId] = useState<string | null>(
    null
  )
  const [repairPostingReportId, setRepairPostingReportId] = useState<string | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [depositPostError, setDepositPostError] = useState<string | null>(null)
  const [entityBlocked, setEntityBlocked] = useState(false)
  const [staffGateRow, setStaffGateRow] =
    useState<CollectorPickupSettlementReconciliation | null>(null)
  const [uploadRow, setUploadRow] = useState<PayInSlipUploadModalRow | null>(null)
  const [verifiedStaff, setVerifiedStaff] = useState<PayInVerifiedStaff | null>(null)
  const [previewRow, setPreviewRow] =
    useState<CollectorPickupSettlementReconciliation | null>(null)
  const [detailRow, setDetailRow] =
    useState<CollectorPickupSettlementReconciliation | null>(null)

  const settlementReturnPath = useMemo(
    () => buildCollectorPickupSettlementReturnPath(filter),
    [filter]
  )

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

  useEffect(() => {
    const fromUrl = parseCollectorPickupSettlementFilterFromSearchParams(searchParams)
    if (!fromUrl) return
    setFilter(fromUrl)
    void load(fromUrl)
  }, [searchParams, load])

  function syncFilterToUrl(values: FinanceFilterValues) {
    const returnPath = buildCollectorPickupSettlementReturnPath(values)
    const queryIndex = returnPath.indexOf("?")
    const query = queryIndex === -1 ? "" : returnPath.slice(queryIndex)
    router.replace(`${pathname}${query}`)
  }

  async function handleApply() {
    syncFilterToUrl(filter)
    await load(filter)
  }

  function handleOpenUpload(row: CollectorPickupSettlementReconciliation) {
    setStaffGateRow(row)
  }

  function handleStaffVerified(staff: PayInVerifiedStaff) {
    if (!staffGateRow) return
    setVerifiedStaff(staff)
    setUploadRow(toUploadModalRow(staffGateRow))
    setStaffGateRow(null)
  }

  async function handleUploadSaved() {
    await load(filter)
    setVerifiedStaff(null)
    setUploadRow(null)
  }

  async function handleDepositPost(collectorReportId: string) {
    const row = items.find((item) => item.collectorReportId === collectorReportId)
    if (!row) return

    if (!isPayInSlipUploaded(row.payInEvidenceStatus)) {
      setDepositPostError("Upload PAY-IN Slip first.")
      return
    }

    setDepositPostingReportId(collectorReportId)
    setDepositPostError(null)
    try {
      await postDepositSettlement(collectorReportId)
      await load(filter)
    } catch (err) {
      setDepositPostError(formatPayInConfirmError(err))
    } finally {
      setDepositPostingReportId(null)
    }
  }

  async function handleRepairPickup(collectorReportId: string) {
    setRepairPostingReportId(collectorReportId)
    setDepositPostError(null)
    try {
      await postCollectorPickupSettlement(collectorReportId)
      await load(filter)
    } catch (err) {
      setDepositPostError(formatCollectorPickupPostError(err))
    } finally {
      setRepairPostingReportId(null)
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

      {loading && items.length === 0 ? (
        <p className="mt-4 text-zinc-600">Loading collector reports…</p>
      ) : null}

      <CollectorPickupSettlementTable
        items={items}
        depositPostingReportId={depositPostingReportId ?? repairPostingReportId}
        depositPostError={depositPostError}
        onUploadSlip={entityBlocked ? undefined : handleOpenUpload}
        onPreviewPayInSlip={setPreviewRow}
        onDepositPost={entityBlocked ? undefined : handleDepositPost}
        onRepairPickup={entityBlocked ? undefined : handleRepairPickup}
        onViewDetail={setDetailRow}
      />

      <CollectorPickupSettlementDetailModal
        open={detailRow != null}
        row={detailRow}
        returnTo={settlementReturnPath}
        onClose={() => setDetailRow(null)}
        onPreviewPayInSlip={(row) => {
          setDetailRow(null)
          setPreviewRow(row)
        }}
      />

      <PayInStaffCredentialGate
        open={staffGateRow != null}
        collectNo={staffGateRow?.collectNo ?? ""}
        onClose={() => setStaffGateRow(null)}
        onVerified={handleStaffVerified}
      />

      <PayInSlipUploadModal
        row={uploadRow}
        verifiedStaff={verifiedStaff}
        open={uploadRow != null && verifiedStaff != null}
        onClose={() => {
          setUploadRow(null)
          setVerifiedStaff(null)
        }}
        onSaved={handleUploadSaved}
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
