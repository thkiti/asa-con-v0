"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  computeManualJournalLineTotals,
  formatManualJournalEntryDocumentNo,
  formatManualJournalEntryTypeLabel,
  MANUAL_JOURNAL_ENTRY_TYPES,
  parseManualJournalAmount,
  type ManualJournalEntryStatusCode,
  type ManualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"
import { ManualJournalEntryStatusBadge } from "@/components/finance/ManualJournalEntryStatusBadge"
import {
  formatAmount,
  formatDateTime,
  formatJournalLineSideAmount,
} from "@/lib/finance-ui/format"
import { fetchGlAccounts } from "@/lib/finance-ui/gl-accounts"
import { fetchManualJournalSessionContext } from "@/lib/finance-ui/manual-journal-entry-session"
import {
  cancelManualJournalEntry,
  confirmManualJournalEntry,
  createManualJournalEntryDraft,
  deleteDraftManualJournalEntry,
  fetchManualJournalEntry,
  postManualJournalEntry,
  retryManualJournalEntryPdf,
  submitManualJournalEntry,
  updateManualJournalEntryDraft,
  buildManualJournalEntryPdfUrl,
  type ManualJournalEntryRead,
} from "@/lib/finance-ui/manual-journal-entries"
import { OpeningBalanceConfirmedDocumentHeader } from "@/components/finance/OpeningBalanceConfirmedDocumentHeader"
import { OpeningBalancePostingVerificationPanel } from "@/components/finance/OpeningBalancePostingVerificationPanel"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { ACCOUNT_DISPLAY_SEPARATOR } from "@/lib/finance-ui/format-account"
import { formatEntityShort } from "@/lib/legal-entity"
import {
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import {
  financeAccount,
  financeAccountDisplay,
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  financeTotalLabel,
  financeTotalRow,
  financeTotalRowStrong,
  financeTotalValue,
  financeDiffBalanced,
  financeDiffUnbalanced,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeInput } from "@/lib/theme/theme-classes"

type LineRow = {
  key: string
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string
}

function emptyLine(): LineRow {
  return {
    key: crypto.randomUUID(),
    accountCode: "",
    accountName: "",
    debit: "",
    credit: "",
    memo: "",
  }
}

function linesFromEntry(entry: ManualJournalEntryRead): LineRow[] {
  if (entry.lines.length === 0) {
    return [emptyLine(), emptyLine()]
  }
  return entry.lines.map((line) => ({
    key: line.id,
    accountCode: line.accountCode,
    accountName: line.accountName,
    debit: line.debit,
    credit: line.credit,
    memo: line.memo ?? "",
  }))
}

function linesToPayload(lines: LineRow[]) {
  return lines
    .map((line) => ({
      accountCode: line.accountCode.trim(),
      debit: line.debit.trim() || "0",
      credit: line.credit.trim() || "0",
      memo: line.memo.trim() || null,
    }))
    .filter(
      (line) =>
        line.accountCode ||
        parseManualJournalAmount(line.debit) ||
        parseManualJournalAmount(line.credit)
    )
}

function editorSeed(
  initialEntry: ManualJournalEntryRead | null,
  initialEntryType: ManualJournalEntryTypeCode
) {
  if (!initialEntry) {
    return {
      entry: null as ManualJournalEntryRead | null,
      branchId: "",
      legalEntityCode: "AS" as DocumentEntityCode,
      entryDate: new Date().toISOString().slice(0, 10),
      entryType: initialEntryType,
      description: "",
      refNo: "",
      lines: [emptyLine(), emptyLine()],
    }
  }
  return {
    entry: initialEntry,
    branchId: initialEntry.branchId,
    legalEntityCode: initialEntry.legalEntityCode as DocumentEntityCode,
    entryDate: initialEntry.entryDate.slice(0, 10),
    entryType: initialEntry.entryType,
    description: initialEntry.description ?? "",
    refNo: initialEntry.refNo ?? "",
    lines: linesFromEntry(initialEntry),
  }
}

type ManualJournalEntryEditorPageProps = {
  mode: "create" | "edit"
  entryId?: string
  initialEntryType?: ManualJournalEntryTypeCode
  /** Optional preloaded entry (tests); skips client fetch when provided. */
  initialEntry?: ManualJournalEntryRead | null
  /** Locks OPENING_BALANCE type and enables OPB-specific UX. */
  openingBalanceMode?: boolean
}

export function ManualJournalEntryEditorPage({
  mode,
  entryId,
  initialEntryType = "MANUAL",
  initialEntry = null,
  openingBalanceMode = false,
}: ManualJournalEntryEditorPageProps) {
  const router = useRouter()
  const resolvedEntryType: ManualJournalEntryTypeCode = openingBalanceMode
    ? "OPENING_BALANCE"
    : initialEntryType
  const listHref = openingBalanceMode
    ? "/finance/opening-balance"
    : "/finance/manual-journal-entries"
  const seed = editorSeed(initialEntry, resolvedEntryType)
  const [loading, setLoading] = useState(mode === "edit" && !initialEntry)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const [entry, setEntry] = useState<ManualJournalEntryRead | null>(seed.entry)
  const [branchId, setBranchId] = useState(seed.branchId)
  const [legalEntityCode, setLegalEntityCode] = useState<DocumentEntityCode>(
    seed.legalEntityCode
  )
  const [entryDate, setEntryDate] = useState(seed.entryDate)
  const [entryType, setEntryType] = useState<ManualJournalEntryTypeCode>(seed.entryType)
  const [description, setDescription] = useState(seed.description)
  const [refNo, setRefNo] = useState(seed.refNo)
  const [lines, setLines] = useState<LineRow[]>(seed.lines)
  const [cancelReason, setCancelReason] = useState("")
  const [showCancelReason, setShowCancelReason] = useState(false)

  const status: ManualJournalEntryStatusCode | "NEW" =
    entry?.status ?? (mode === "create" ? "NEW" : "DRAFT")

  const isDraft = status === "DRAFT" || status === "NEW"
  const isSubmitted = status === "SUBMITTED"
  const isConfirmed = status === "CONFIRMED"
  const isPosted = status === "POSTED"
  const isCancelled = status === "CANCELLED"
  const readOnly = isPosted || isCancelled || isSubmitted || isConfirmed
  const canEditHeader = isDraft
  const canEditLines = isDraft

  const totals = useMemo(() => computeManualJournalLineTotals(lines), [lines])

  function formatLineSideAmount(value: string): string {
    return openingBalanceMode ? formatJournalLineSideAmount(value) : formatAmount(value)
  }

  const memoColSpan = canEditLines ? 2 : 1
  const opbConfirmedDocumentLayout = openingBalanceMode && isConfirmed && entry != null

  const applyEntry = useCallback((loaded: ManualJournalEntryRead) => {
    setEntry(loaded)
    setBranchId(loaded.branchId)
    setLegalEntityCode(loaded.legalEntityCode as DocumentEntityCode)
    setEntryDate(loaded.entryDate.slice(0, 10))
    setEntryType(loaded.entryType)
    setDescription(loaded.description ?? "")
    setRefNo(loaded.refNo ?? "")
    setLines(linesFromEntry(loaded))
  }, [])

  useEffect(() => {
    if (mode === "create") {
      void fetchManualJournalSessionContext().then((session) => {
        if (!session) return
        setBranchId(session.branchId)
        setLegalEntityCode(session.documentEntityCode)
      })
      return
    }

    if (!entryId) {
      setError("Entry id is required")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    void fetchManualJournalEntry(entryId)
      .then(applyEntry)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load entry")
      })
      .finally(() => setLoading(false))
  }, [mode, entryId, applyEntry])

  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)))
  }

  async function resolveAccountName(accountCode: string): Promise<string> {
    const code = accountCode.trim()
    if (!code) return ""
    try {
      const result = await fetchGlAccounts({ search: code, limit: 5, view: "flat" })
      if (result.view !== "flat") return ""
      const match = result.accounts.find((row) => row.code === code)
      return match?.name ?? ""
    } catch {
      return ""
    }
  }

  async function handleAccountBlur(key: string, accountCode: string) {
    if (!canEditLines) return
    const name = await resolveAccountName(accountCode)
    if (name) updateLine(key, { accountName: name })
  }

  async function handleSave(): Promise<ManualJournalEntryRead | null> {
    setError(null)
    setStatusMessage(null)
    const payloadLines = linesToPayload(lines)

    if (!branchId.trim()) {
      setError("Branch is required.")
      return null
    }

    setBusyAction("save")
    try {
      if (mode === "create" || !entry) {
        const created = await createManualJournalEntryDraft({
          branchId: branchId.trim(),
          legalEntityCode,
          entryDate,
          entryType: openingBalanceMode ? "OPENING_BALANCE" : entryType,
          description: description.trim() || null,
          refNo: refNo.trim() || null,
          lines: payloadLines,
        })
        applyEntry(created)
        setStatusMessage("Draft created.")
        router.replace(`${listHref}/${created.id}`)
        return created
      }

      const updated = await updateManualJournalEntryDraft(entry.id, {
        entryDate,
        description: description.trim() || null,
        refNo: refNo.trim() || null,
        lines: payloadLines,
      })
      applyEntry(updated)
      setStatusMessage("Draft saved.")
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
      return null
    } finally {
      setBusyAction(null)
    }
  }

  async function runWorkflow(
    action: string,
    fn: () => Promise<ManualJournalEntryRead>
  ): Promise<void> {
    setError(null)
    setStatusMessage(null)
    setBusyAction(action)
    try {
      const result = await fn()
      applyEntry(result)
      setStatusMessage(`${action} completed.`)
      setShowCancelReason(false)
      setCancelReason("")
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`)
    } finally {
      setBusyAction(null)
    }
  }

  async function handleSubmit() {
    if (!totals.balanced) {
      setError("Entry must be balanced before submit.")
      return
    }
    let current = entry
    if (isDraft) {
      current = await handleSave()
      if (!current) return
    }
    await runWorkflow("Submit", () => submitManualJournalEntry(current!.id))
  }

  async function handleConfirm() {
    if (!entry) return
    await runWorkflow("Confirm", () => confirmManualJournalEntry(entry.id))
  }

  async function handlePost() {
    if (!entry) return
    if (!totals.balanced) {
      setError("Entry must be balanced before post.")
      return
    }
    setError(null)
    setStatusMessage(null)
    setPdfError(null)
    setBusyAction("Post")
    try {
      const result = await postManualJournalEntry(entry.id)
      applyEntry(result.entry)
      if (result.pdfStatus === "ready") {
        setStatusMessage("Post completed. PDF snapshot is ready.")
      } else {
        setPdfError(result.pdfError ?? null)
        setStatusMessage(
          "Post completed. PDF snapshot is pending — use Retry PDF when storage is available."
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRetryPdf() {
    if (!entry) return
    setError(null)
    setStatusMessage(null)
    setPdfError(null)
    setBusyAction("Retry PDF")
    try {
      const result = await retryManualJournalEntryPdf(entry.id)
      applyEntry(result.entry)
      if (result.pdfStatus === "ready") {
        setStatusMessage("PDF snapshot generated.")
      } else {
        setPdfError(result.pdfError ?? "PDF snapshot is still pending / repair needed.")
        setStatusMessage("PDF snapshot is still pending / repair needed.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF retry failed")
    } finally {
      setBusyAction(null)
    }
  }

  function handleViewPdf() {
    if (!entry) return
    window.open(buildManualJournalEntryPdfUrl(entry.id, "inline"), "_blank", "noopener,noreferrer")
  }

  async function handleCancel() {
    if (!entry) return
    await runWorkflow("Cancel", () =>
      cancelManualJournalEntry(entry.id, {
        cancelReason: cancelReason.trim() || null,
      })
    )
  }

  async function handleDelete() {
    if (!entry) return
    setBusyAction("delete")
    setError(null)
    try {
      await deleteDraftManualJournalEntry(entry.id)
      router.push(listHref)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
      setBusyAction(null)
    }
  }

  const documentNo = formatManualJournalEntryDocumentNo(
    entry?.entryNo,
    entry?.entryType ?? entryType
  )

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading journal entry…</p>
  }

  return (
    <div
      className={opbConfirmedDocumentLayout ? "space-y-4" : "space-y-6"}
      data-testid="manual-journal-entry-editor"
    >
      {openingBalanceMode && !opbConfirmedDocumentLayout ? (
        <div
          className="rounded border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm text-sky-950"
          data-testid="opb-mode-banner"
        >
          Opening balance (OPB) — use balance-sheet accounts only (asset, liability, equity).
          Revenue and expense accounts are not allowed.
        </div>
      ) : null}

      {opbConfirmedDocumentLayout ? (
        <OpeningBalanceConfirmedDocumentHeader
          documentNo={documentNo}
          entryDate={entryDate}
          description={description}
          entry={entry}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                className="font-mono text-lg font-semibold"
                data-testid="manual-journal-document-no"
              >
                {documentNo}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Legal entity: {formatEntityShort(legalEntityCode)}
              </p>
              {entry ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ManualJournalEntryStatusBadge status={entry.status} />
                  <span className="text-xs text-zinc-500">
                    {formatManualJournalEntryTypeLabel(entry.entryType)}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
                  {formatManualJournalEntryTypeLabel(entryType)}
                </p>
              )}
            </div>
            {entry?.postedJournalEntryId ? (
              <Link
                href={`/finance/journal-entries/${entry.postedJournalEntryId}`}
                className="text-sm text-zinc-600 underline"
                data-testid="posted-journal-link"
              >
                View posted GL journal
              </Link>
            ) : null}
          </div>

          {readOnly ? (
            <p className="text-sm text-zinc-600" data-testid="read-only-notice">
              This entry is read-only in status {entry?.status}.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">Branch</span>
              <input
                className="rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-50"
                value={branchId}
                disabled={!canEditHeader}
                onChange={(e) => setBranchId(e.target.value)}
                data-testid="field-branch-id"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">Entry date</span>
              <input
                type="date"
                className="rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-50"
                value={entryDate}
                disabled={!canEditHeader}
                onChange={(e) => setEntryDate(e.target.value)}
                data-testid="field-entry-date"
              />
            </label>
            {canEditHeader && !openingBalanceMode ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">Entry type</span>
                <select
                  className="rounded border border-zinc-300 px-2 py-1"
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as ManualJournalEntryTypeCode)}
                  data-testid="field-entry-type"
                >
                  {MANUAL_JOURNAL_ENTRY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatManualJournalEntryTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-sm">
                <span className="text-zinc-600">Entry type</span>
                <p className="mt-1">{formatManualJournalEntryTypeLabel(entryType)}</p>
              </div>
            )}
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-zinc-600">Description</span>
              <input
                className="rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-50"
                value={description}
                disabled={!canEditHeader}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="field-description"
              />
            </label>
            {refNo.trim() || canEditHeader ? (
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-zinc-600">Reference no</span>
                <input
                  className="rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-50"
                  value={refNo}
                  disabled={!canEditHeader}
                  onChange={(e) => setRefNo(e.target.value)}
                  data-testid="field-ref-no"
                />
              </label>
            ) : null}
          </div>

          {entry ? (
            <div className="grid gap-2 text-xs text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
              <p>Created: {formatDateTime(entry.createdAt)}</p>
              {entry.submittedAt ? <p>Submitted: {formatDateTime(entry.submittedAt)}</p> : null}
              {entry.confirmedAt ? <p>Confirmed: {formatDateTime(entry.confirmedAt)}</p> : null}
              {entry.postedAt ? <p>Posted: {formatDateTime(entry.postedAt)}</p> : null}
              {entry.cancelledAt ? <p>Cancelled: {formatDateTime(entry.cancelledAt)}</p> : null}
            </div>
          ) : null}
        </>
      )}

      <div className={financeTableScroll}>
        <table className={financeTable} data-testid="manual-journal-lines-table">
          <thead>
            <tr>
              <th className={financeTh}>Account</th>
              <th className={financeThRight}>Debit</th>
              <th className={financeThRight}>Credit</th>
              <th className={financeTh}>Memo</th>
              {canEditLines ? <th className={financeTh} /> : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => (
              <tr key={row.key}>
                <td className={financeAccount}>
                  {canEditLines ? (
                    <span className={financeAccountDisplay}>
                      <input
                        className={`${themeInput} finance-account-code-input mt-0`}
                        value={row.accountCode}
                        onChange={(e) => updateLine(row.key, { accountCode: e.target.value })}
                        onBlur={() => void handleAccountBlur(row.key, row.accountCode)}
                        data-testid="line-account-code"
                      />
                      {row.accountName ? (
                        <>
                          <span className="finance-account-separator">
                            {ACCOUNT_DISPLAY_SEPARATOR}
                          </span>
                          <span
                            className="finance-account-name-part"
                            data-testid="line-account-name"
                          >
                            {row.accountName}
                          </span>
                        </>
                      ) : (
                        <span data-testid="line-account-name" className="sr-only" />
                      )}
                    </span>
                  ) : (
                    <FinanceAccountDisplay
                      accountCode={row.accountCode}
                      accountName={row.accountName}
                      data-testid="line-account-name"
                    />
                  )}
                </td>
                <td className={financeNumber}>
                  {canEditLines ? (
                    <input
                      className={`${themeInput} mt-0`}
                      value={row.debit}
                      onChange={(e) => updateLine(row.key, { debit: e.target.value })}
                      inputMode="decimal"
                      data-testid="line-debit"
                    />
                  ) : (
                    formatLineSideAmount(row.debit)
                  )}
                </td>
                <td className={financeNumber}>
                  {canEditLines ? (
                    <input
                      className={`${themeInput} mt-0`}
                      value={row.credit}
                      onChange={(e) => updateLine(row.key, { credit: e.target.value })}
                      inputMode="decimal"
                      data-testid="line-credit"
                    />
                  ) : (
                    formatLineSideAmount(row.credit)
                  )}
                </td>
                <td>
                  {canEditLines ? (
                    <input
                      className={`${themeInput} mt-0`}
                      value={row.memo}
                      onChange={(e) => updateLine(row.key, { memo: e.target.value })}
                      data-testid="line-memo"
                    />
                  ) : (
                    <span className={financeMemo}>{row.memo || "—"}</span>
                  )}
                </td>
                {canEditLines ? (
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      className="text-xs text-muted underline"
                      onClick={() => removeLine(row.key)}
                    >
                      Remove
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {openingBalanceMode ? (
              <>
                <tr className={financeTotalRow}>
                  <td className={financeTotalLabel} colSpan={1}>
                    Total Debit
                  </td>
                  <td className={financeTotalValue} data-testid="line-total-debit">
                    {formatAmount(String(totals.debit))}
                  </td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" colSpan={memoColSpan} />
                </tr>
                <tr>
                  <td className={financeTotalLabel} colSpan={1}>
                    Total Credit
                  </td>
                  <td className="px-2 py-2" />
                  <td className={financeTotalValue} data-testid="line-total-credit">
                    {formatAmount(String(totals.credit))}
                  </td>
                  <td className="px-2 py-2" colSpan={memoColSpan} />
                </tr>
                <tr className={financeTotalRowStrong}>
                  <td className={financeTotalLabel} colSpan={1}>
                    Difference
                  </td>
                  <td className={financeTotalValue} colSpan={2} data-testid="line-total-difference">
                    <span
                      className={
                        totals.balanced ? financeDiffBalanced : financeDiffUnbalanced
                      }
                    >
                      {formatAmount(String(totals.difference))}
                    </span>
                  </td>
                  <td className="px-2 py-2" colSpan={memoColSpan} />
                </tr>
              </>
            ) : (
              <tr className={financeTotalRowStrong}>
                <td className={financeTotalLabel} colSpan={1}>
                  Totals
                </td>
                <td className={financeTotalValue} data-testid="line-total-debit">
                  {formatAmount(String(totals.debit))}
                </td>
                <td className={financeTotalValue} data-testid="line-total-credit">
                  {formatAmount(String(totals.credit))}
                </td>
                <td className="px-2 py-2" colSpan={memoColSpan}>
                  <span
                    data-testid="line-balance-status"
                    className={
                      totals.balanced ? financeDiffBalanced : financeDiffUnbalanced
                    }
                  >
                    {totals.balanced
                      ? "Balanced"
                      : `Difference ${formatAmount(String(totals.difference))}`}
                  </span>
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {!totals.balanced ? (
        <p className="text-sm text-amber-800" data-testid="unbalanced-warning">
          Entry is out of balance. Submit and post are disabled until debit equals credit.
        </p>
      ) : null}

      {canEditLines ? (
        <button
          type="button"
          className="rounded border border-zinc-300 px-3 py-1 text-sm"
          onClick={addLine}
          data-testid="add-line"
        >
          Add line
        </button>
      ) : null}

      {(isSubmitted || isConfirmed) && showCancelReason ? (
        <label className="flex flex-col gap-1 text-sm max-w-md">
          <span className="text-zinc-600">Cancel reason</span>
          <input
            className="rounded border border-zinc-300 px-2 py-1"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            data-testid="field-cancel-reason"
          />
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-2" data-testid="workflow-actions">
        {isDraft ? (
          <>
            <button
              type="button"
              className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
              disabled={busyAction !== null}
              onClick={() => void handleSave()}
              data-testid="action-save"
            >
              {busyAction === "save" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={busyAction !== null || !totals.balanced}
              onClick={() => void handleSubmit()}
              data-testid="action-submit"
            >
              {busyAction === "Submit" ? "Submitting…" : "Submit"}
            </button>
            {entry ? (
              <button
                type="button"
                className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
                disabled={busyAction !== null}
                onClick={() => void handleDelete()}
                data-testid="action-delete"
              >
                {busyAction === "delete" ? "Deleting…" : "Delete"}
              </button>
            ) : null}
          </>
        ) : null}

        {isSubmitted ? (
          <>
            <button
              type="button"
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={busyAction !== null}
              onClick={() => void handleConfirm()}
              data-testid="action-confirm"
            >
              {busyAction === "Confirm" ? "Confirming…" : "Confirm"}
            </button>
            <button
              type="button"
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
              disabled={busyAction !== null}
              onClick={() => setShowCancelReason(true)}
              data-testid="action-cancel-open"
            >
              Cancel
            </button>
            {showCancelReason ? (
              <button
                type="button"
                className="rounded border border-red-500 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
                disabled={busyAction !== null}
                onClick={() => void handleCancel()}
                data-testid="action-cancel"
              >
                Confirm cancel
              </button>
            ) : null}
          </>
        ) : null}

        {isConfirmed ? (
          <>
            <button
              type="button"
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={busyAction !== null || !totals.balanced}
              onClick={() => void handlePost()}
              data-testid="action-post"
            >
              {busyAction === "Post" ? "Posting…" : "Post"}
            </button>
            <button
              type="button"
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
              disabled={busyAction !== null}
              onClick={() => setShowCancelReason(true)}
              data-testid="action-cancel-open"
            >
              Cancel
            </button>
            {showCancelReason ? (
              <button
                type="button"
                className="rounded border border-red-500 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
                disabled={busyAction !== null}
                onClick={() => void handleCancel()}
                data-testid="action-cancel"
              >
                Confirm cancel
              </button>
            ) : null}
          </>
        ) : null}

        {isPosted ? (
          <>
            {entry?.pdfSnapshotReady ? (
              <>
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
                  disabled={busyAction !== null}
                  onClick={handleViewPdf}
                  data-testid="action-view-pdf"
                >
                  View PDF
                </button>
                <a
                  className="rounded border border-zinc-300 px-4 py-2 text-sm"
                  href={buildManualJournalEntryPdfUrl(entry.id, "attachment")}
                  data-testid="action-download-pdf"
                >
                  Download PDF
                </a>
              </>
            ) : (
              <>
                <p
                  className="text-sm text-amber-800"
                  data-testid="pdf-pending-message"
                >
                  PDF pending / repair needed
                </p>
                {pdfError ? (
                  <p className="text-sm text-red-700" data-testid="pdf-error-message">
                    {pdfError}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="rounded border border-amber-400 px-4 py-2 text-sm text-amber-900 disabled:opacity-50"
                  disabled={busyAction !== null}
                  onClick={() => void handleRetryPdf()}
                  data-testid="action-retry-pdf"
                >
                  {busyAction === "Retry PDF" ? "Retrying…" : "Retry PDF"}
                </button>
              </>
            )}
          </>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700" data-testid="editor-error">{error}</p>
      ) : null}
      {statusMessage ? (
        <p className="text-sm text-emerald-800" data-testid="editor-status">{statusMessage}</p>
      ) : null}

      {openingBalanceMode && isPosted && entry ? (
        <OpeningBalancePostingVerificationPanel
          entryId={entry.id}
          entryNo={entry.entryNo}
          postedJournalEntryId={entry.postedJournalEntryId}
        />
      ) : null}
    </div>
  )
}
