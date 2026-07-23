"use client"

import type { ChangeEvent, ReactNode } from "react"
import type { ImportEndCsvResultVM, EndDocumentDetailVM } from "@/lib/stock-ui/end-fetchers"
import { formatDocumentDate } from "@/lib/stock-ui/format"
import { formatMoney } from "@/lib/pricing-ui/format-money"
import {
  themeBtnPrimary,
  themeBtnSecondary,
  themeInlineError,
  themeMuted,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"
import { EndLinesGrid } from "./EndLinesGrid"
import { EndManualOpeningPanel } from "./EndManualOpeningPanel"

export type EndDocumentActionsVM = {
  canRebuild: boolean
  canSubmit: boolean
  canLock: boolean
  canReopen: boolean
  canImport: boolean
}

type EndDocumentViewProps = {
  title: string
  detail: EndDocumentDetailVM
  actions: EndDocumentActionsVM
  busy: string | null
  error: string | null
  statusMessage: string | null
  importPreview: ImportEndCsvResultVM | null
  onRebuild: () => void
  onSubmit: () => void
  onLock: () => void
  onReopen: () => void
  onImportFile: (file: File) => void
  onApplyImport: () => void
  onClearImportPreview: () => void
  onSaveManualOpening?: (
    lines: Array<{
      productCode: string
      beginQty: number
      countQty: number | null
    }>
  ) => void
}

function money(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—"
  return formatMoney(value) || "—"
}

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className={`text-xs uppercase tracking-wide ${themeMuted}`}>{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

export function EndDocumentView({
  title,
  detail,
  actions,
  busy,
  error,
  statusMessage,
  importPreview,
  onRebuild,
  onSubmit,
  onLock,
  onReopen,
  onImportFile,
  onApplyImport,
  onClearImportPreview,
  onSaveManualOpening,
}: EndDocumentViewProps) {
  const locked = detail.endStatus === "LOCKED"
  const branchLabel = detail.branch
    ? `${detail.branch.code} · ${detail.branch.name}`
    : detail.branchId

  const completenessNotes = parseCompleteness(detail.endCompletenessNotes)
  const showImport = actions.canImport && detail.periodMonth === "2026-01" && !locked
  const showManualOpening =
    Boolean(onSaveManualOpening) &&
    actions.canImport &&
    detail.periodMonth === "2026-01" &&
    !locked

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) onImportFile(file)
  }

  return (
    <div className="space-y-4" data-testid="end-document-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" data-testid="end-document-title">
            {title}
          </h1>
          <p className={`mt-1 text-sm ${themeTextSecondary}`}>
            Period quantity summary — locking does not create StockTransaction.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {actions.canRebuild ? (
            <button
              type="button"
              className={themeBtnSecondary}
              disabled={locked || busy != null}
              onClick={onRebuild}
            >
              {busy === "rebuild" ? "Rebuilding…" : "Rebuild"}
            </button>
          ) : null}
          {actions.canSubmit ? (
            <button
              type="button"
              className={themeBtnSecondary}
              disabled={locked || busy != null}
              onClick={onSubmit}
            >
              {busy === "submit" ? "Submitting…" : "Submit"}
            </button>
          ) : null}
          {actions.canLock ? (
            <button
              type="button"
              className={themeBtnPrimary}
              disabled={locked || busy != null}
              onClick={onLock}
            >
              {busy === "lock" ? "Locking…" : "Lock"}
            </button>
          ) : null}
          {actions.canReopen ? (
            <button
              type="button"
              className={themeBtnSecondary}
              disabled={!locked || busy != null}
              onClick={onReopen}
            >
              {busy === "reopen" ? "Reopening…" : "Reopen"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className={themeInlineError} role="alert" data-testid="end-document-error">
          {error}
        </p>
      ) : null}
      {statusMessage ? (
        <p className={`text-sm ${themeTextSecondary}`} data-testid="end-document-status">
          {statusMessage}
        </p>
      ) : null}

      <dl className="grid gap-3 rounded border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem label="Ref">{detail.refNo || "—"}</MetaItem>
        <MetaItem label="Period">{detail.periodMonth || "—"}</MetaItem>
        <MetaItem label="Shop">{branchLabel}</MetaItem>
        <MetaItem label="END status">{detail.endStatus || "—"}</MetaItem>
        <MetaItem label="Rebuilt at">
          {detail.endRebuiltAt ? formatDocumentDate(detail.endRebuiltAt) : "—"}
        </MetaItem>
        <MetaItem label="Locked at">
          {detail.endLockedAt ? formatDocumentDate(detail.endLockedAt) : "—"}
        </MetaItem>
        <MetaItem label="Entity">{detail.legalEntityCode}</MetaItem>
        <MetaItem label="Completeness">
          {detail.endCompletenessOk ? "OK" : "Incomplete"}
        </MetaItem>
      </dl>

      <section className="rounded border border-border bg-card p-3">
        <h2 className="text-sm font-semibold">Sales summary</h2>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem label="TRACKABLE">{money(detail.endTrackableSales)}</MetaItem>
          <MetaItem label="UNTRACKABLE">{money(detail.endUntrackableSales)}</MetaItem>
          <MetaItem label="TOTAL">{money(detail.endTotalSales)}</MetaItem>
          <MetaItem label="REFUND">{money(detail.endRefundsTotal)}</MetaItem>
        </dl>
        <p className="mt-3 text-sm">
          <span className={themeMuted}>TOTAL ADJ Amount: </span>
          <span className="font-semibold tabular-nums">
            {money(detail.endTotalAdjAmount)}
          </span>
        </p>
      </section>

      {(completenessNotes.blockers.length > 0 ||
        completenessNotes.warnings.length > 0) && (
        <section
          className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"
          data-testid="end-completeness-warnings"
        >
          <h2 className="font-semibold text-amber-900">Completeness</h2>
          {completenessNotes.blockers.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-amber-950">
              {completenessNotes.blockers.map((item, i) => (
                <li key={`b-${i}`}>{item.message}</li>
              ))}
            </ul>
          ) : null}
          {completenessNotes.warnings.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-amber-900">
              {completenessNotes.warnings.map((item, i) => (
                <li key={`w-${i}`}>{item.message}</li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      {showManualOpening && onSaveManualOpening ? (
        <EndManualOpeningPanel
          disabled={locked}
          busy={busy === "manual-opening"}
          onSave={onSaveManualOpening}
        />
      ) : null}

      {showImport ? (
        <section className="rounded border border-border bg-card p-3">
          <h2 className="text-sm font-semibold">CSV import (2026-01 init)</h2>
          <p className={`mt-1 text-sm ${themeMuted}`}>
            Columns: Product Code, BEGIN Qty, COUNT Qty (optional). Preview then apply.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={busy != null}
              data-testid="end-import-file"
            />
            {importPreview ? (
              <>
                <button
                  type="button"
                  className={themeBtnPrimary}
                  disabled={!importPreview.valid || busy != null}
                  onClick={onApplyImport}
                >
                  {busy === "import-apply" ? "Applying…" : "Apply import"}
                </button>
                <button
                  type="button"
                  className={themeBtnSecondary}
                  disabled={busy != null}
                  onClick={onClearImportPreview}
                >
                  Clear preview
                </button>
              </>
            ) : null}
          </div>
          {importPreview ? (
            <div className="mt-3 space-y-2 text-sm">
              <p>
                Preview: {importPreview.rows.length} row(s) ·{" "}
                {importPreview.valid ? "valid" : "invalid"}
              </p>
              {importPreview.errors.length > 0 ? (
                <ul className="list-disc pl-5 text-red-700">
                  {importPreview.errors.map((err, i) => (
                    <li key={i}>
                      Row {err.row}
                      {err.productCode ? ` (${err.productCode})` : ""}: {err.message}
                    </li>
                  ))}
                </ul>
              ) : null}
              {importPreview.warnings.length > 0 ? (
                <ul className={`list-disc pl-5 ${themeMuted}`}>
                  {importPreview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : null}
              {importPreview.valid && importPreview.rows.length > 0 ? (
                <div className="overflow-auto rounded border border-border">
                  <table className="min-w-[480px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-2 py-1">Code</th>
                        <th className="px-2 py-1 text-right">BEGIN</th>
                        <th className="px-2 py-1 text-right">COUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 20).map((row) => (
                        <tr key={row.row} className="border-b border-border/60">
                          <td className="px-2 py-1 font-mono text-xs">
                            {row.productCode}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {row.beginQty}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {row.countQty ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.rows.length > 20 ? (
                    <p className={`px-2 py-1 ${themeMuted}`}>
                      Showing first 20 of {importPreview.rows.length} rows.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <EndLinesGrid lines={detail.endLines ?? []} readOnly={locked} />
    </div>
  )
}

function parseCompleteness(raw: string | null | undefined): {
  blockers: Array<{ message: string }>
  warnings: Array<{ message: string }>
} {
  if (!raw?.trim()) return { blockers: [], warnings: [] }
  try {
    const parsed = JSON.parse(raw) as {
      blockers?: Array<{ message?: string }>
      warnings?: Array<{ message?: string }>
    }
    return {
      blockers: (parsed.blockers ?? [])
        .map((b) => ({ message: String(b.message ?? "") }))
        .filter((b) => b.message),
      warnings: (parsed.warnings ?? [])
        .map((w) => ({ message: String(w.message ?? "") }))
        .filter((w) => w.message),
    }
  } catch {
    return { blockers: [], warnings: [{ message: raw }] }
  }
}
