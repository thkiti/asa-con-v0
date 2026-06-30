"use client"

import { PayInSlipIndicator } from "@/components/finance/PayInSlipIndicator"
import type { CollectorPickupSettlementReconciliation } from "@/lib/finance-ui/collector-pickup-settlement"
import {
  collectorPickupBusinessStatusTone,
  isEligibleForPayInEvidenceUpload,
  isPayInSlipUploaded,
  mapCollectorPickupBusinessStatus,
  PAY_IN_EVIDENCE_MISSING_TOOLTIP,
  shouldShowDepositPostButton,
  shouldShowDepositPostDisabled,
  shouldShowPickupRepairButton,
} from "@/lib/finance-ui/collector-pickup-settlement-display"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  collectorPickupPostBtn,
  collectorPickupPostBtnMuted,
  collectorPickupSettlementTable,
  collectorPickupSettlementTableWrap,
  collectorPickupTdAmount,
  collectorPickupTdBranch,
  collectorPickupTdCollectNo,
  collectorPickupTdStatus,
  collectorPickupTdWorkflow,
  collectorPickupTh,
  collectorPickupThAmount,
  collectorPickupThStatus,
  collectorPickupThWorkflow,
  collectorPickupWorkflowActions,
  themeBadgeSuccess,
  themeBannerError,
  themeEmptyState,
} from "@/lib/finance-ui/finance-visual-classes"

type CollectorPickupSettlementTableProps = {
  items: CollectorPickupSettlementReconciliation[]
  depositPostingReportId?: string | null
  selectedPayInReportIds?: ReadonlySet<string>
  onTogglePayInSelect?: (collectorReportId: string) => void
  onUploadSlip?: (row: CollectorPickupSettlementReconciliation) => void
  onPreviewPayInSlip?: (row: CollectorPickupSettlementReconciliation) => void
  onDepositPost?: (collectorReportId: string) => void
  onRepairPickup?: (collectorReportId: string) => void
  onViewDetail?: (row: CollectorPickupSettlementReconciliation) => void
  depositPostError?: string | null
}

function formatBranch(row: CollectorPickupSettlementReconciliation): string {
  const code = row.branchCode?.trim()
  const name = row.branchName?.trim()
  if (code && name) return `${code} — ${name}`
  return code ?? name ?? row.branchId
}

function BusinessStatusBadge({
  row,
  onViewDetail,
}: {
  row: CollectorPickupSettlementReconciliation
  onViewDetail?: (row: CollectorPickupSettlementReconciliation) => void
}) {
  const label = mapCollectorPickupBusinessStatus(row.status)
  const badge = (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${collectorPickupBusinessStatusTone(label)}`}
    >
      {label}
    </span>
  )

  if (!onViewDetail) return badge

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 border-0 bg-transparent p-0"
      data-testid={`status-detail-${row.collectorReportId}`}
      title="View settlement detail"
      onClick={() => onViewDetail(row)}
    >
      {badge}
    </button>
  )
}

function DepositWorkflowAction({
  row,
  isDepositPosting,
  onDepositPost,
}: {
  row: CollectorPickupSettlementReconciliation
  isDepositPosting: boolean
  onDepositPost?: (collectorReportId: string) => void
}) {
  const showDepositPost = shouldShowDepositPostButton({
    pickupStatus: row.status,
    depositStatus: row.depositStatus,
    payInEvidenceStatus: row.payInEvidenceStatus,
    archiveAvailable: row.archiveAvailable,
  })
  const showDepositPostDisabled = shouldShowDepositPostDisabled({
    pickupStatus: row.status,
    depositStatus: row.depositStatus,
    payInEvidenceStatus: row.payInEvidenceStatus,
    archiveAvailable: row.archiveAvailable,
  })

  if (row.depositStatus === "POSTED") {
    return (
      <span
        className={`${themeBadgeSuccess} px-1.5 py-0.5 text-[10px]`}
        data-testid={`deposit-posted-${row.collectorReportId}`}
      >
        POSTED
      </span>
    )
  }

  if (showDepositPost && onDepositPost) {
    return (
      <button
        type="button"
        data-testid={`deposit-post-${row.collectorReportId}`}
        disabled={isDepositPosting}
        onClick={() => onDepositPost(row.collectorReportId)}
        className={collectorPickupPostBtn}
      >
        {isDepositPosting ? "Posting…" : "POST"}
      </button>
    )
  }

  if (showDepositPostDisabled) {
    return (
      <button
        type="button"
        data-testid={`deposit-post-disabled-${row.collectorReportId}`}
        disabled
        title={PAY_IN_EVIDENCE_MISSING_TOOLTIP}
        className={collectorPickupPostBtnMuted}
      >
        POST
      </button>
    )
  }

  return <span className="text-xs text-muted">—</span>
}

export function CollectorPickupSettlementTable({
  items,
  depositPostingReportId = null,
  selectedPayInReportIds,
  onTogglePayInSelect,
  onUploadSlip,
  onPreviewPayInSlip,
  onDepositPost,
  onRepairPickup,
  onViewDetail,
  depositPostError = null,
}: CollectorPickupSettlementTableProps) {
  if (items.length === 0) {
    return (
      <p className={`text-sm ${themeEmptyState}`}>No collector reports in this range.</p>
    )
  }

  return (
    <div className={collectorPickupSettlementTableWrap}>
      <table
        className={collectorPickupSettlementTable}
        data-testid="collector-pickup-settlement-table"
      >
        <colgroup>
          <col className="collector-pickup-col-collect" />
          <col className="collector-pickup-col-branch" />
          <col className="collector-pickup-col-expected" />
          <col className="collector-pickup-col-status" />
          <col className="collector-pickup-col-workflow" />
        </colgroup>
        <thead>
          <tr>
            <th className={collectorPickupTh}>Collect No</th>
            <th className={collectorPickupTh}>Branch</th>
            <th className={collectorPickupThAmount}>Expected</th>
            <th className={collectorPickupThStatus}>Status</th>
            <th className={collectorPickupThWorkflow}>PAY-IN SLIP / DEPOSIT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const slipUploaded = isPayInSlipUploaded({
              archiveAvailable: row.archiveAvailable,
              payInEvidenceStatus: row.payInEvidenceStatus,
            })
            const previewUrl =
              row.payInEvidenceDownloadPath ?? row.payInEvidenceUrl
            const isDepositPosting = depositPostingReportId === row.collectorReportId
            const showRepair = shouldShowPickupRepairButton(row.status)
            const canUploadSlip = isEligibleForPayInEvidenceUpload({
              pickupStatus: row.status,
              depositStatus: row.depositStatus,
              archiveAvailable: row.archiveAvailable,
              payInEvidenceStatus: row.payInEvidenceStatus,
            })
            const showPayInSelect =
              canUploadSlip && onUploadSlip != null && onTogglePayInSelect != null

            return (
              <tr key={row.collectorReportId}>
                <td className={collectorPickupTdCollectNo}>
                  {onViewDetail ? (
                    <button
                      type="button"
                      className="cursor-pointer border-0 bg-transparent p-0 font-mono text-sm text-[#2563eb] underline underline-offset-2 hover:text-[#1d4ed8]"
                      data-testid={`collect-no-detail-${row.collectorReportId}`}
                      onClick={() => onViewDetail(row)}
                    >
                      {row.collectNo}
                    </button>
                  ) : (
                    row.collectNo
                  )}
                </td>
                <td className={collectorPickupTdBranch} title={formatBranch(row)}>
                  {formatBranch(row)}
                </td>
                <td className={collectorPickupTdAmount}>
                  {formatAmount(row.expectedAmount)}
                </td>
                <td className={collectorPickupTdStatus}>
                  <BusinessStatusBadge row={row} onViewDetail={onViewDetail} />
                  {showRepair && onRepairPickup ? (
                    <button
                      type="button"
                      data-testid={`pickup-repair-${row.collectorReportId}`}
                      className="ml-1 text-[10px] text-amber-800 underline"
                      onClick={() => onRepairPickup(row.collectorReportId)}
                    >
                      Repair
                    </button>
                  ) : null}
                </td>
                <td className={collectorPickupTdWorkflow}>
                  <div className={collectorPickupWorkflowActions}>
                    {showPayInSelect ? (
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 accent-emerald-600"
                        data-testid={`pay-in-select-${row.collectorReportId}`}
                        checked={selectedPayInReportIds?.has(row.collectorReportId) ?? false}
                        title="Include in batch pay-in slip upload"
                        aria-label={`Select ${row.collectNo} for batch pay-in slip upload`}
                        onChange={() => onTogglePayInSelect(row.collectorReportId)}
                      />
                    ) : null}
                    <PayInSlipIndicator
                      status={row.payInEvidenceStatus}
                      missingWarning={row.payInSlipMissingWarning}
                      testId={`pay-in-slip-${row.collectorReportId}`}
                      onUpload={
                        canUploadSlip && onUploadSlip
                          ? () => onUploadSlip(row)
                          : undefined
                      }
                      onPreview={
                        slipUploaded && previewUrl && onPreviewPayInSlip
                          ? () => onPreviewPayInSlip(row)
                          : undefined
                      }
                    />
                    <DepositWorkflowAction
                      row={row}
                      isDepositPosting={isDepositPosting}
                      onDepositPost={onDepositPost}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {depositPostError ? (
        <p className={`mt-3 ${themeBannerError}`} data-testid="deposit-post-error">
          {depositPostError}
        </p>
      ) : null}
    </div>
  )
}
