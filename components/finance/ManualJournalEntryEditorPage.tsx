"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  computeManualJournalLineTotals,
  formatManualJournalEntryDocumentNo,
  formatManualJournalEntryStatusLabel,
  parseManualJournalAmount,
  type ManualJournalEntryStatusCode,
  type ManualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"
import {
  formatAmount,
  formatJournalLineSideAmount,
} from "@/lib/finance-ui/format"
import { formatFinanceDocumentDate } from "@/lib/finance-ui/finance-document-display"
import { fetchGlAccounts } from "@/lib/finance-ui/gl-accounts"
import { fetchManualJournalSessionContext } from "@/lib/finance-ui/manual-journal-entry-session"
import { LEGACY_PDF_SNAPSHOT_DELETE_CONFIRM } from "@/lib/finance-ui/finance-legacy-pdf-snapshot"
import { verifyArchivedPdfRegenerationResult } from "@/lib/finance-ui/manual-journal-entry-pdf-archive"
import {
  cancelManualJournalEntry,
  confirmManualJournalEntry,
  createManualJournalEntryDraft,
  deleteDraftManualJournalEntry,
  deleteManualJournalEntryArchivedPdf,
  fetchManualJournalEntry,
  postManualJournalEntry,
  retryManualJournalEntryPdf,
  submitManualJournalEntry,
  updateManualJournalEntryDraft,
  type ManualJournalEntryRead,
} from "@/lib/finance-ui/manual-journal-entries"
import { FinanceVoucherPostedPrintView } from "@/components/finance/FinanceVoucherPostedPrintView"
import { FinanceDocumentSummaryRow } from "@/components/finance/FinanceDocumentSummaryRow"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { MjvLineAccountInput } from "@/components/finance/MjvLineAccountInput"
import { OpeningBalancePostingVerificationPanel } from "@/components/finance/OpeningBalancePostingVerificationPanel"
import {
  buildFinanceJournalInquiryPath,
} from "@/lib/finance-ui/finance-navigation"
import { useFinanceCurrentReturnPath } from "@/lib/finance-ui/use-finance-current-return-path"
import {
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import type { Role } from "@/lib/shared"
import {
  financeAccount,
  financeAuditLine,
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  financeTotalLabel,
  financeTotalRowStrong,
  financeTotalValue,
  financeDiffUnbalanced,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeInput } from "@/lib/theme/theme-classes"
import { buildFinanceVoucherPrintModelFromManualJournalEntry } from "@/lib/finance-ui/finance-voucher-print"
import { appendFinanceLegalEntityToPath } from "@/lib/finance-ui/finance-entity-scope"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"

type LineField = "account" | "debit" | "credit" | "memo"

type LineRow = {
  key: string
  accountCode: string
  accountName: string
  accountError: string | null
  debit: string
  credit: string
  memo: string
}

function emptyLine(): LineRow {
  return {
    key: crypto.randomUUID(),
    accountCode: "",
    accountName: "",
    accountError: null,
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
    accountError: null,
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

function formatMjvEntryRefNo(entryNo: string | null | undefined): string {
  if (entryNo?.trim()) return entryNo.trim()
  return "Draft / Pending number"
}

function focusLineField(lineKey: string, field: LineField): void {
  const el = document.querySelector(
    `[data-line-key="${lineKey}"][data-field="${field}"]`
  ) as HTMLElement | null
  el?.focus()
}

function scheduleFocusLineField(lineKey: string, field: LineField): void {
  window.requestAnimationFrame(() => focusLineField(lineKey, field))
}

function MjvLineTrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M6 6l1 14h10l1-14" strokeLinejoin="round" />
    </svg>
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
  const currentReturnPath = useFinanceCurrentReturnPath()
  const legalEntityScope = useFinanceLegalEntityScope()
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
  const activeLegalEntityCode: DocumentEntityCode =
    (entry?.legalEntityCode as DocumentEntityCode | undefined) ?? legalEntityScope
  const scopedListHref = appendFinanceLegalEntityToPath(listHref, activeLegalEntityCode)
  const [entryDate, setEntryDate] = useState(seed.entryDate)
  const [entryType, setEntryType] = useState<ManualJournalEntryTypeCode>(seed.entryType)
  const [description, setDescription] = useState(seed.description)
  const [refNo, setRefNo] = useState(seed.refNo)
  const [lines, setLines] = useState<LineRow[]>(seed.lines)
  const [cancelReason, setCancelReason] = useState("")
  const [showCancelReason, setShowCancelReason] = useState(false)
  const [branchLabel, setBranchLabel] = useState("")
  const [sessionRole, setSessionRole] = useState<Role | null>(null)
  const [focusedAccountLineKey, setFocusedAccountLineKey] = useState<string | null>(null)
  const accountEnterCommitRef = useRef<string | null>(null)

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

  const applyEntry = useCallback((loaded: ManualJournalEntryRead) => {
    setEntry(loaded)
    setBranchId(loaded.branchId)
    setEntryDate(loaded.entryDate.slice(0, 10))
    setEntryType(loaded.entryType)
    setDescription(loaded.description ?? "")
    setRefNo(loaded.refNo ?? "")
    setLines(linesFromEntry(loaded))
  }, [])

  useEffect(() => {
    void fetchManualJournalSessionContext().then((session) => {
      if (!session) return
      setSessionRole(session.role)
      if (mode === "create") {
        setBranchId(session.branchId)
      }
      const label = [session.branchCode, session.branchName]
        .filter(Boolean)
        .join(" • ")
      setBranchLabel(label)
    })
  }, [mode])

  useEffect(() => {
    if (mode === "create" || initialEntry != null) {
      return
    }

    if (!entryId) {
      setError("Entry id is required")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    void fetchManualJournalEntry(activeLegalEntityCode, entryId)
      .then(applyEntry)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load entry")
      })
      .finally(() => setLoading(false))
  }, [mode, entryId, applyEntry, initialEntry, activeLegalEntityCode])

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
    const code = accountCode.trim()
    if (!code) {
      updateLine(key, { accountName: "", accountError: null })
      return
    }
    const name = await resolveAccountName(code)
    if (name) {
      updateLine(key, { accountCode: code, accountName: name, accountError: null })
    } else {
      updateLine(key, { accountName: "", accountError: "—" })
    }
  }

  function handleAccountFocus(lineKey: string) {
    setFocusedAccountLineKey(lineKey)
  }

  function handleAccountBlurEvent(lineKey: string, accountCode: string) {
    if (accountEnterCommitRef.current === lineKey) {
      accountEnterCommitRef.current = null
      setFocusedAccountLineKey(null)
      return
    }
    setFocusedAccountLineKey(null)
    void handleAccountBlur(lineKey, accountCode)
  }

  function handleAccountChange(lineKey: string, value: string) {
    updateLine(lineKey, {
      accountCode: value,
      accountName: "",
      accountError: null,
    })
  }

  async function handleLineEnter(
    lineKey: string,
    field: LineField,
    row: LineRow,
    lineIndex: number
  ) {
    if (field === "account") {
      accountEnterCommitRef.current = lineKey
      setFocusedAccountLineKey(null)
      await handleAccountBlur(lineKey, row.accountCode)
      scheduleFocusLineField(lineKey, "debit")
      return
    }
    if (field === "debit") {
      scheduleFocusLineField(lineKey, "credit")
      return
    }
    if (field === "credit") {
      scheduleFocusLineField(lineKey, "memo")
      return
    }

    if (lineIndex === lines.length - 1) {
      const newLine = emptyLine()
      setLines((prev) => [...prev, newLine])
      scheduleFocusLineField(newLine.key, "account")
      return
    }

    scheduleFocusLineField(lines[lineIndex + 1]!.key, "account")
  }

  function handleLineKeyDown(
    event: React.KeyboardEvent,
    lineKey: string,
    field: LineField,
    row: LineRow,
    lineIndex: number
  ) {
    if (event.key !== "Enter") return
    event.preventDefault()
    void handleLineEnter(lineKey, field, row, lineIndex)
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
        const created = await createManualJournalEntryDraft(activeLegalEntityCode, {
          branchId: branchId.trim(),
          legalEntityCode: activeLegalEntityCode,
          entryDate,
          entryType: openingBalanceMode ? "OPENING_BALANCE" : entryType,
          description: description.trim() || null,
          refNo: refNo.trim() || null,
          lines: payloadLines,
        })
        applyEntry(created)
        setStatusMessage("Draft created.")
        router.replace(
          appendFinanceLegalEntityToPath(
            `${listHref}/${created.id}`,
            created.legalEntityCode as DocumentEntityCode
          )
        )
        return created
      }

      const updated = await updateManualJournalEntryDraft(activeLegalEntityCode, entry.id, {
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
    await runWorkflow("Submit", () =>
      submitManualJournalEntry(activeLegalEntityCode, current!.id)
    )
  }

  async function handleConfirm() {
    if (!entry) return
    await runWorkflow("Confirm", () =>
      confirmManualJournalEntry(activeLegalEntityCode, entry.id)
    )
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
      const result = await postManualJournalEntry(activeLegalEntityCode, entry.id)
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

  async function handleRegeneratePdf() {
    if (!entry) return
    setError(null)
    setStatusMessage(null)
    setPdfError(null)
    setBusyAction("Regenerate PDF")
    const hadArchive = entry.pdfSnapshotReady
    const beforePdfGeneratedAt = entry.pdfGeneratedAt
    try {
      const result = await retryManualJournalEntryPdf(activeLegalEntityCode, entry.id)
      applyEntry(result.entry)
      const verificationError = verifyArchivedPdfRegenerationResult({
        hadArchive,
        beforePdfGeneratedAt,
        afterEntry: result.entry,
      })
      if (verificationError) {
        setPdfError(verificationError)
        setStatusMessage(null)
        return
      }
      if (result.pdfStatus === "ready") {
        setStatusMessage("Archived PDF regenerated.")
      } else {
        setPdfError(result.pdfError ?? "PDF snapshot is still pending / repair needed.")
        setStatusMessage("PDF snapshot is still pending / repair needed.")
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "PDF regeneration failed")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDeleteArchivedPdf() {
    if (!entry) return
    if (!window.confirm(LEGACY_PDF_SNAPSHOT_DELETE_CONFIRM)) return
    setError(null)
    setStatusMessage(null)
    setPdfError(null)
    setBusyAction("Delete PDF")
    try {
      const result = await deleteManualJournalEntryArchivedPdf(activeLegalEntityCode, entry.id)
      applyEntry(result.entry)
      setStatusMessage("Archived PDF deleted.")
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "PDF delete failed")
    } finally {
      setBusyAction(null)
    }
  }

  const canRegenerateArchivedPdf = sessionRole === "HO_ADMIN"

  async function handleCancel() {
    if (!entry) return
    await runWorkflow("Cancel", () =>
      cancelManualJournalEntry(activeLegalEntityCode, entry.id, {
        cancelReason: cancelReason.trim() || null,
      })
    )
  }

  async function handleDelete() {
    if (!entry) return
    setBusyAction("delete")
    setError(null)
    try {
      await deleteDraftManualJournalEntry(activeLegalEntityCode, entry.id)
      router.push(scopedListHref)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
      setBusyAction(null)
    }
  }

  const documentNo = formatManualJournalEntryDocumentNo(
    entry?.entryNo,
    entry?.entryType ?? entryType
  )
  const entryRefNo = formatMjvEntryRefNo(entry?.entryNo)

  const postedJournalHref =
    entry?.postedJournalEntryId != null
      ? buildFinanceJournalInquiryPath(entry.postedJournalEntryId, currentReturnPath)
      : null

  const voucherPrintModel =
    isPosted && entry
      ? buildFinanceVoucherPrintModelFromManualJournalEntry(entry)
      : null

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading journal entry…</p>
  }

  return (
    <div className="w-full space-y-4" data-testid="manual-journal-entry-editor">
      {isPosted && entry && voucherPrintModel ? (
        <>
          <FinanceDocumentSummaryRow
            documentNo={documentNo}
            entryDate={entryDate}
            status={entry.status}
          />
          {statusMessage ? (
            <p className="text-sm text-emerald-800" data-testid="editor-status">
              {statusMessage}
            </p>
          ) : null}
          <FinanceVoucherPostedPrintView
            model={voucherPrintModel}
            entryType={entry.entryType}
            legalEntityCode={activeLegalEntityCode}
            entryDate={entryDate}
            description={description}
            listHref={scopedListHref}
            listBackLabel={
              openingBalanceMode ? "Opening balance" : "Journal entries"
            }
            postedJournalHref={postedJournalHref}
            disabled={busyAction !== null}
            embeddedInDocumentContainer
            compactScreenHeader
            showListBackLink={false}
            showPrintActions={false}
            showArchiveDownload={false}
            compactArchiveActions
            archive={{
              entryId: entry.id,
              entryNo: documentNo,
              pdfSnapshotReady: entry.pdfSnapshotReady,
              pdfCacheKey: entry.pdfGeneratedAt,
              onRegenerate: canRegenerateArchivedPdf
                ? () => void handleRegeneratePdf()
                : undefined,
              onDelete: canRegenerateArchivedPdf
                ? () => void handleDeleteArchivedPdf()
                : undefined,
              regenerating: busyAction === "Regenerate PDF",
              deleting: busyAction === "Delete PDF",
              regenerateError: pdfError,
              showRegenerateButton: canRegenerateArchivedPdf,
            }}
          />
        </>
      ) : (
        <div className="w-full space-y-3" data-testid="mjv-entry-shell">
          {openingBalanceMode ? (
            <div
              className="rounded border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm text-sky-950"
              data-testid="opb-mode-banner"
            >
              Opening balance (OPB) — use balance-sheet accounts only (asset, liability,
              equity). Revenue and expense accounts are not allowed.
            </div>
          ) : null}

          {openingBalanceMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          ) : (
            <div
              className={`${financeAuditLine} flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm text-zinc-800`}
              data-testid="mjv-entry-meta-row"
            >
              <span className="shrink-0">
                Ref. No.:{" "}
                <span className="font-mono font-medium" data-testid="mjv-entry-ref-no">
                  {entryRefNo}
                </span>
              </span>
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-1">
                <span className="shrink-0">Date prepared:</span>
                {canEditHeader ? (
                  <input
                    type="date"
                    className="rounded border border-zinc-300 px-2 py-0.5 text-sm disabled:bg-zinc-50"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    data-testid="field-entry-date"
                  />
                ) : (
                  <span data-testid="mjv-entry-date-prepared">
                    {formatFinanceDocumentDate(entryDate)}
                  </span>
                )}
              </span>
              <label className="flex min-w-[12rem] flex-1 items-baseline gap-x-1">
                <span className="shrink-0 text-zinc-800">Description:</span>
                {canEditHeader ? (
                  <input
                    className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-0.5 text-sm disabled:bg-zinc-50"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    data-testid="field-description"
                  />
                ) : (
                  <span data-testid="field-description-readonly">{description || "—"}</span>
                )}
              </label>
            </div>
          )}

          {readOnly ? (
            <p className="text-sm text-zinc-600" data-testid="read-only-notice">
              This entry is read-only in status{" "}
              {entry?.status ? formatManualJournalEntryStatusLabel(entry.status) : status}.
            </p>
          ) : null}

          <div className={financeTableScroll}>
            <table
              className={`${financeTable} mjv-entry-lines-table`}
              data-testid="manual-journal-lines-table"
            >
              <colgroup>
                <col className="mjv-col-account" />
                <col className="mjv-col-debit" />
                <col className="mjv-col-credit" />
                <col className="mjv-col-memo" />
                {canEditLines ? <col className="mjv-col-trash" /> : null}
              </colgroup>
              <thead>
                <tr>
                  <th className={financeTh}>Account</th>
                  <th className={financeThRight}>Debit</th>
                  <th className={financeThRight}>Credit</th>
                  <th className={financeTh}>Memo</th>
                  {canEditLines ? <th className={financeTh} aria-label="Remove line" /> : null}
                </tr>
              </thead>
              <tbody>
                {lines.map((row, lineIndex) => (
                  <tr key={row.key}>
                    <td className={financeAccount}>
                      {canEditLines ? (
                        <MjvLineAccountInput
                          lineKey={row.key}
                          accountCode={row.accountCode}
                          accountName={row.accountName}
                          accountError={row.accountError}
                          focused={focusedAccountLineKey === row.key}
                          onFocus={() => handleAccountFocus(row.key)}
                          onBlur={() => handleAccountBlurEvent(row.key, row.accountCode)}
                          onChange={(value) => handleAccountChange(row.key, value)}
                          onKeyDown={(e) =>
                            handleLineKeyDown(e, row.key, "account", row, lineIndex)
                          }
                        />
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
                          className={`${themeInput} mjv-line-field-input mt-0`}
                          value={row.debit}
                          onChange={(e) => updateLine(row.key, { debit: e.target.value })}
                          onKeyDown={(e) =>
                            handleLineKeyDown(e, row.key, "debit", row, lineIndex)
                          }
                          inputMode="decimal"
                          data-line-key={row.key}
                          data-field="debit"
                          data-testid="line-debit"
                        />
                      ) : (
                        formatLineSideAmount(row.debit)
                      )}
                    </td>
                    <td className={financeNumber}>
                      {canEditLines ? (
                        <input
                          className={`${themeInput} mjv-line-field-input mt-0`}
                          value={row.credit}
                          onChange={(e) => updateLine(row.key, { credit: e.target.value })}
                          onKeyDown={(e) =>
                            handleLineKeyDown(e, row.key, "credit", row, lineIndex)
                          }
                          inputMode="decimal"
                          data-line-key={row.key}
                          data-field="credit"
                          data-testid="line-credit"
                        />
                      ) : (
                        formatLineSideAmount(row.credit)
                      )}
                    </td>
                    <td className={financeMemo}>
                      {canEditLines ? (
                        <input
                          className={`${themeInput} mjv-line-field-input mt-0`}
                          value={row.memo}
                          onChange={(e) => updateLine(row.key, { memo: e.target.value })}
                          onKeyDown={(e) =>
                            handleLineKeyDown(e, row.key, "memo", row, lineIndex)
                          }
                          data-line-key={row.key}
                          data-field="memo"
                          data-testid="line-memo"
                        />
                      ) : (
                        <span className={financeMemo}>{row.memo || "—"}</span>
                      )}
                    </td>
                    {canEditLines ? (
                      <td className="mjv-line-trash-cell px-1 py-1 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-700"
                          aria-label="Remove line"
                          onClick={() => removeLine(row.key)}
                          data-testid="line-remove"
                        >
                          <MjvLineTrashIcon />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot data-testid="mjv-entry-totals">
                <tr className={financeTotalRowStrong}>
                  <td className={financeTotalLabel}>Total</td>
                  <td className={financeTotalValue} data-testid="line-total-debit">
                    {formatAmount(String(totals.debit))}
                  </td>
                  <td className={financeTotalValue} data-testid="line-total-credit">
                    {formatAmount(String(totals.credit))}
                  </td>
                  <td className={financeMemo} />
                  {canEditLines ? <td /> : null}
                </tr>
              </tfoot>
            </table>
          </div>

          {!totals.balanced ? (
            <>
              <p
                className={`text-sm font-medium ${financeDiffUnbalanced}`}
                data-testid="line-balance-status"
              >
                Not Balanced
              </p>
              <p className="text-sm text-amber-800" data-testid="unbalanced-warning">
                Entry is out of balance. Submit and post are disabled until debit equals credit.
              </p>
            </>
          ) : null}

          {(isSubmitted || isConfirmed) && showCancelReason ? (
            <label className="flex max-w-md flex-col gap-1 text-sm">
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

            <Link
              href={listHref}
              className="rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
              data-testid="action-back"
            >
              Back
            </Link>
          </div>

          {error ? (
            <p className="text-sm text-red-700" data-testid="editor-error">
              {error}
            </p>
          ) : null}
          {statusMessage ? (
            <p className="text-sm text-emerald-800" data-testid="editor-status">
              {statusMessage}
            </p>
          ) : null}
        </div>
      )}

      {openingBalanceMode && isPosted && entry ? (
        <OpeningBalancePostingVerificationPanel
          entryId={entry.id}
          postedJournalEntryId={entry.postedJournalEntryId}
          headerContext={{
            legalEntityCode: activeLegalEntityCode,
            entryType: entry.entryType,
            documentNo,
            entryDate,
            status: entry.status,
            description,
            createdAt: entry.createdAt,
            submittedAt: entry.submittedAt,
            confirmedAt: entry.confirmedAt,
            postedAt: entry.postedAt,
            cancelledAt: entry.cancelledAt,
          }}
        />
      ) : null}
    </div>
  )
}
