import type { CountingHookGroup } from "@/lib/stock-ui/counting-hook-groups"
import { isCountingEditorMode } from "@/lib/stock-ui/editor-draft-state"
import type {
  EditorLineRowVM,
  StockDocumentEditorStateVM,
} from "@/lib/stock-ui/editor-types"
import type {
  StockDocumentActionId,
  StockDocumentActionVM,
  StockDocumentDetailVM,
} from "@/lib/stock-ui/types"
import {
  STOCK_COUNT_STAFF_BACK_HREF,
} from "@/lib/stock-ui/stock-count-staff-mode"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import { formatStaffFacingDocumentTitle } from "@/lib/stock-ui/format"
import type { ShopBranchOption } from "@/lib/stock-ui/fetch-shop-branches"
import { StockDocumentCountingSheet } from "./StockDocumentCountingSheet"
import { StockDocumentEditorToolbarActions } from "./StockDocumentEditorToolbarActions"
import { StockDocumentHeaderForm } from "./StockDocumentHeaderForm"
import { StockDocumentLinesTable } from "./StockDocumentLinesTable"
import {
  StockDocumentPrintHeader,
  StockDocumentPrintLinesTable,
} from "./stock-document-print-ui"

type StockDocumentEditorViewProps = {
  state: StockDocumentEditorStateVM
  detailSnapshot: StockDocumentDetailVM | null
  loading: boolean
  saving: boolean
  actionBusy: StockDocumentActionId | null
  actions: StockDocumentActionVM[]
  error: string | null
  statusMessage: string | null
  countingMode: boolean
  staffOperationalSheet?: boolean
  activeHookGroup: CountingHookGroup
  onHookGroupChange: (hookGroup: CountingHookGroup) => void
  onHeaderChange: (patch: Partial<StockDocumentEditorStateVM>) => void
  onAddLine: () => void
  onRemoveLine: (key: string) => void
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
  onWorkflowAction: (actionId: StockDocumentActionId) => void
  stockCountStaffMode?: boolean
  staffHeader?: {
    branchCode: string
    branchName: string
    staffCode: string
    staffName: string
  } | null
  viewerEntityCode?: DocumentEntityCode
  shopOptions?: readonly ShopBranchOption[]
  hoBranch?: ShopBranchOption | null
}

export function StockDocumentEditorView({
  state,
  detailSnapshot,
  loading,
  saving,
  actionBusy,
  actions,
  error,
  statusMessage,
  countingMode,
  staffOperationalSheet = false,
  activeHookGroup,
  onHookGroupChange,
  onHeaderChange,
  onAddLine,
  onRemoveLine,
  onLineChange,
  onWorkflowAction,
  stockCountStaffMode = false,
  staffHeader = null,
  viewerEntityCode = DEFAULT_DOCUMENT_ENTITY_CODE,
  shopOptions = [],
  hoBranch = null,
}: StockDocumentEditorViewProps) {
  const showOperationalSheet =
    staffOperationalSheet || (countingMode && isCountingEditorMode(state))
  const showPrintSnapshot = detailSnapshot && !stockCountStaffMode
  const documentEntityCode =
    parseDocumentEntityCode(state.legalEntityCode) ??
    parseDocumentEntityCode(detailSnapshot?.legalEntityCode) ??
    viewerEntityCode
  const staffPhaseTitle = formatStaffFacingDocumentTitle(
    state.docType,
    state.status,
    documentEntityCode
  )

  const toolbarActions = (
    <StockDocumentEditorToolbarActions
      state={state}
      actions={actions}
      saving={saving}
      actionBusy={actionBusy}
      onWorkflowAction={onWorkflowAction}
      backHref={stockCountStaffMode ? STOCK_COUNT_STAFF_BACK_HREF : undefined}
      backLabel={stockCountStaffMode ? "Back" : undefined}
      staffCountControls={stockCountStaffMode}
    />
  )

  return (
    <div
      className={
        stockCountStaffMode
          ? "stock-document-print-shell stock-count-staff-mode flex min-h-0 flex-1 flex-col"
          : "stock-document-print-shell space-y-6"
      }
    >
      {showPrintSnapshot ? (
        <>
          <StockDocumentPrintHeader
            detail={detailSnapshot}
            viewerEntityCode={documentEntityCode}
          />
          <StockDocumentPrintLinesTable detail={detailSnapshot} />
        </>
      ) : null}

      {loading ? <p className="text-sm text-zinc-600">Loading document…</p> : null}

      {state.readOnly && !loading ? (
        <p className="no-print rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This document is not a draft. Editing is disabled.
        </p>
      ) : null}

      {error ? (
        <p
          className={
            stockCountStaffMode
              ? "no-print mb-1 shrink-0 truncate rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800"
              : "no-print rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          }
        >
          {error}
        </p>
      ) : null}

      {statusMessage ? (
        <p
          className={
            stockCountStaffMode
              ? "no-print mb-1 shrink-0 truncate rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-800"
              : "no-print rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
          }
        >
          {statusMessage}
        </p>
      ) : null}

      {!loading ? (
        <>
          {!stockCountStaffMode ? (
            <div className="no-print">
              <StockDocumentHeaderForm
                state={state}
                onChange={onHeaderChange}
                viewerEntityCode={documentEntityCode}
                shopOptions={shopOptions}
                hoBranch={hoBranch}
              />
            </div>
          ) : null}

          <div className={stockCountStaffMode ? "no-print flex min-h-0 flex-1 flex-col" : "no-print"}>
            {showOperationalSheet ? (
              <StockDocumentCountingSheet
                lines={state.lines}
                activeHookGroup={activeHookGroup}
                readOnly={state.readOnly}
                onHookGroupChange={onHookGroupChange}
                onLineChange={onLineChange}
                toolbarActions={toolbarActions}
                staffOperationalPhase={
                  stockCountStaffMode
                    ? {
                        docType: state.docType,
                        status: state.status,
                        viewerEntityCode: documentEntityCode,
                      }
                    : null
                }
                staffCountBanner={
                  stockCountStaffMode && staffHeader
                    ? {
                        refNo: state.refNo,
                        branchCode: staffHeader.branchCode,
                        branchName: staffHeader.branchName,
                        staffCode: staffHeader.staffCode,
                        staffName: staffHeader.staffName,
                        documentDate: state.date,
                      }
                    : null
                }
                staffPhaseTitle={stockCountStaffMode ? staffPhaseTitle : null}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-end gap-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3">
                  {toolbarActions}
                </div>
                <StockDocumentLinesTable
                  docType={state.docType}
                  lines={state.lines}
                  readOnly={state.readOnly}
                  onAddLine={onAddLine}
                  onRemoveLine={onRemoveLine}
                  onLineChange={onLineChange}
                />
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
