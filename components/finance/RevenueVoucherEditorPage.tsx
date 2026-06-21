"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { FinanceDocumentCanonicalHeader } from "@/components/finance/FinanceDocumentCanonicalHeader"
import { MjvLineAccountInput } from "@/components/finance/MjvLineAccountInput"
import { formatFinanceDocumentDate } from "@/lib/finance-ui/finance-document-display"
import { buildFinanceJournalInquiryPath } from "@/lib/finance-ui/finance-navigation"
import { formatAmount } from "@/lib/finance-ui/format"
import { formatThaiBahtAmountInWords } from "@/lib/finance-ui/format-thai-baht-words"
import { fetchGlAccounts } from "@/lib/finance-ui/gl-accounts"
import { fetchManualJournalSessionContext } from "@/lib/finance-ui/manual-journal-entry-session"
import {
  filterRevReceiveToAccountOptions,
  formatRevReceiveToOptionLabel,
  type RevReceiveToAccountOption,
} from "@/lib/finance-ui/rev-receive-to-accounts"
import {
  computeRevenueVoucherCreditTotal,
  formatRevEntryRefNo,
  formatRevenueVoucherDocumentNo,
  formatRevenueVoucherStatusLabel,
  parseRevenueVoucherAmount,
  REVENUE_VOUCHER_ENTRY_TYPE,
  type RevenueVoucherStatusCode,
} from "@/lib/finance-ui/revenue-voucher-display"
import {
  cancelRevenueVoucher,
  confirmRevenueVoucher,
  createRevenueVoucherDraft,
  deleteDraftRevenueVoucher,
  fetchRevenueVoucher,
  postRevenueVoucher,
  submitRevenueVoucher,
  updateRevenueVoucherDraft,
  type RevenueVoucherRead,
} from "@/lib/finance-ui/revenue-vouchers"
import { useFinanceCurrentReturnPath } from "@/lib/finance-ui/use-finance-current-return-path"
import {
  financeAccount,
  financeAuditLine,
  financeDocumentContainer,
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
import {
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import { themeInput, themeLinkMuted } from "@/lib/theme/theme-classes"

type LineField = "account" | "credit" | "memo"

type LineRow = {
  key: string
  accountCode: string
  accountName: string
  accountError: string | null
  credit: string
  memo: string
}

function emptyLine(): LineRow {
  return {
    key: crypto.randomUUID(),
    accountCode: "",
    accountName: "",
    accountError: null,
    credit: "",
    memo: "",
  }
}

function linesFromEntry(entry: RevenueVoucherRead): LineRow[] {
  if (entry.lines.length === 0) {
    return [emptyLine()]
  }
  return entry.lines.map((line) => ({
    key: line.id,
    accountCode: line.accountCode,
    accountName: line.accountName,
    accountError: null,
    credit: line.credit,
    memo: line.memo ?? "",
  }))
}

function linesToPayload(lines: LineRow[]) {
  return lines
    .map((line) => ({
      accountCode: line.accountCode.trim(),
      credit: line.credit.trim() || "0",
      memo: line.memo.trim() || null,
    }))
    .filter(
      (line) => line.accountCode || parseRevenueVoucherAmount(line.credit) > 0
    )
}

function editorSeed(initialEntry: RevenueVoucherRead | null) {
  if (!initialEntry) {
    return {
      entry: null as RevenueVoucherRead | null,
      branchId: "",
      legalEntityCode: "AS" as DocumentEntityCode,
      entryDate: new Date().toISOString().slice(0, 10),
      receiveToAccountId: "",
      receiveToAccountCode: "",
      receiveToAccountName: "",
      receivedFromName: "",
      refNo: "",
      receiptNo: "",
      description: "",
      lines: [emptyLine()],
    }
  }
  return {
    entry: initialEntry,
    branchId: initialEntry.branchId,
    legalEntityCode: initialEntry.legalEntityCode as DocumentEntityCode,
    entryDate: initialEntry.entryDate.slice(0, 10),
    receiveToAccountId: initialEntry.receiveToAccountId,
    receiveToAccountCode: initialEntry.receiveToAccountCode,
    receiveToAccountName: initialEntry.receiveToAccountName,
    receivedFromName: initialEntry.receivedFromName,
    refNo: initialEntry.refNo ?? "",
    receiptNo: initialEntry.receiptNo ?? "",
    description: initialEntry.description ?? "",
    lines: linesFromEntry(initialEntry),
  }
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

function RevLineTrashIcon() {
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

type RevenueVoucherEditorPageProps = {
  mode: "create" | "edit"
  entryId?: string
  initialEntry?: RevenueVoucherRead | null
}

export function RevenueVoucherEditorPage({
  mode,
  entryId,
  initialEntry = null,
}: RevenueVoucherEditorPageProps) {
  const router = useRouter()
  const currentReturnPath = useFinanceCurrentReturnPath()
  const listHref = "/finance/revenue-vouchers"
  const seed = editorSeed(initialEntry)

  const [loading, setLoading] = useState(mode === "edit" && !initialEntry)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [entry, setEntry] = useState<RevenueVoucherRead | null>(seed.entry)
  const [branchId, setBranchId] = useState(seed.branchId)
  const [legalEntityCode, setLegalEntityCode] = useState<DocumentEntityCode>(
    seed.legalEntityCode
  )
  const [entryDate, setEntryDate] = useState(seed.entryDate)
  const [receiveToAccountId, setReceiveToAccountId] = useState(seed.receiveToAccountId)
  const [receiveToAccountCode, setReceiveToAccountCode] = useState(seed.receiveToAccountCode)
  const [receiveToAccountName, setReceiveToAccountName] = useState(seed.receiveToAccountName)
  const [receivedFromName, setReceivedFromName] = useState(seed.receivedFromName)
  const [refNo, setRefNo] = useState(seed.refNo)
  const [receiptNo, setReceiptNo] = useState(seed.receiptNo)
  const [description, setDescription] = useState(seed.description)
  const [lines, setLines] = useState<LineRow[]>(seed.lines)
  const [cancelReason, setCancelReason] = useState("")
  const [showCancelReason, setShowCancelReason] = useState(false)
  const [receiveToOptions, setReceiveToOptions] = useState<RevReceiveToAccountOption[]>([])
  const [focusedAccountLineKey, setFocusedAccountLineKey] = useState<string | null>(null)
  const accountEnterCommitRef = useRef<string | null>(null)

  const status: RevenueVoucherStatusCode | "NEW" =
    entry?.status ?? (mode === "create" ? "NEW" : "DRAFT")

  const isDraft = status === "DRAFT" || status === "NEW"
  const isSubmitted = status === "SUBMITTED"
  const isConfirmed = status === "CONFIRMED"
  const isPosted = status === "POSTED"
  const isCancelled = status === "CANCELLED"
  const readOnly = isPosted || isCancelled || isSubmitted || isConfirmed
  const canEditHeader = isDraft
  const canEditLines = isDraft

  const creditTotal = useMemo(() => computeRevenueVoucherCreditTotal(lines), [lines])
  const showDerivedDebitLine = Boolean(receiveToAccountId.trim())
  const debitTotal = showDerivedDebitLine ? creditTotal : 0
  const totalsBalanced = debitTotal === creditTotal
  const canSubmitOrPost =
    creditTotal > 0 &&
    receiveToAccountId.trim().length > 0 &&
    receivedFromName.trim().length > 0

  const applyEntry = useCallback((loaded: RevenueVoucherRead) => {
    setEntry(loaded)
    setBranchId(loaded.branchId)
    setLegalEntityCode(loaded.legalEntityCode as DocumentEntityCode)
    setEntryDate(loaded.entryDate.slice(0, 10))
    setReceiveToAccountId(loaded.receiveToAccountId)
    setReceiveToAccountCode(loaded.receiveToAccountCode)
    setReceiveToAccountName(loaded.receiveToAccountName)
    setReceivedFromName(loaded.receivedFromName)
    setRefNo(loaded.refNo ?? "")
    setReceiptNo(loaded.receiptNo ?? "")
    setDescription(loaded.description ?? "")
    setLines(linesFromEntry(loaded))
  }, [])

  useEffect(() => {
    void fetchManualJournalSessionContext().then((session) => {
      if (!session) return
      if (mode === "create") {
        setBranchId(session.branchId)
        setLegalEntityCode(session.documentEntityCode)
      }
    })
  }, [mode])

  useEffect(() => {
    void fetchGlAccounts({
      accountType: "ASSET",
      isActive: "true",
      view: "flat",
      limit: 500,
    }).then((result) => {
      if (result.view !== "flat") return
      setReceiveToOptions(filterRevReceiveToAccountOptions(result.accounts))
    })
  }, [])

  useEffect(() => {
    if (mode === "create") return
    if (!entryId) {
      setError("Entry id is required")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    void fetchRevenueVoucher(entryId)
      .then(applyEntry)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load revenue voucher")
      })
      .finally(() => setLoading(false))
  }, [mode, entryId, applyEntry])

  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)))
  }

  async function resolveGlAccount(
    accountCode: string
  ): Promise<{ id: string; code: string; name: string } | null> {
    const code = accountCode.trim()
    if (!code) return null
    try {
      const result = await fetchGlAccounts({ search: code, limit: 5, view: "flat" })
      if (result.view !== "flat") return null
      const match = result.accounts.find((row) => row.code === code)
      if (!match) return null
      return { id: match.id, code: match.code, name: match.name }
    } catch {
      return null
    }
  }

  async function handleAccountBlur(key: string, accountCode: string) {
    if (!canEditLines) return
    const code = accountCode.trim()
    if (!code) {
      updateLine(key, { accountName: "", accountError: null })
      return
    }
    const match = await resolveGlAccount(code)
    if (match) {
      updateLine(key, { accountCode: code, accountName: match.name, accountError: null })
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

  function handleReceiveToSelect(accountId: string) {
    if (!accountId) {
      setReceiveToAccountId("")
      setReceiveToAccountCode("")
      setReceiveToAccountName("")
      return
    }
    const option = receiveToOptions.find((row) => row.id === accountId)
    if (!option) return
    setReceiveToAccountId(option.id)
    setReceiveToAccountCode(option.code)
    setReceiveToAccountName(option.name)
  }

  async function ensureReceiveToResolved(): Promise<boolean> {
    if (receiveToAccountId.trim()) return true
    setError("Receive-to account is required.")
    return false
  }

  async function handleSave(): Promise<RevenueVoucherRead | null> {
    setError(null)
    setStatusMessage(null)

    if (!branchId.trim()) {
      setError("Branch is required.")
      return null
    }
    if (!receivedFromName.trim()) {
      setError("Received from is required.")
      return null
    }
    if (!(await ensureReceiveToResolved())) {
      return null
    }

    const payloadLines = linesToPayload(lines)

    setBusyAction("save")
    try {
      if (mode === "create" || !entry) {
        const created = await createRevenueVoucherDraft({
          branchId: branchId.trim(),
          legalEntityCode,
          entryDate,
          receiveToAccountId: receiveToAccountId.trim(),
          receivedFromName: receivedFromName.trim(),
          description: description.trim() || null,
          refNo: refNo.trim() || null,
          receiptNo: receiptNo.trim() || null,
          lines: payloadLines,
        })
        applyEntry(created)
        setStatusMessage("Draft created.")
        router.replace(`${listHref}/${created.id}`)
        return created
      }

      const updated = await updateRevenueVoucherDraft(entry.id, {
        entryDate,
        receiveToAccountId: receiveToAccountId.trim(),
        receivedFromName: receivedFromName.trim(),
        description: description.trim() || null,
        refNo: refNo.trim() || null,
        receiptNo: receiptNo.trim() || null,
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
    fn: () => Promise<RevenueVoucherRead>
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
    if (!canSubmitOrPost) {
      setError(
        "Enter receive-to account, received from, and at least one credit line before submit."
      )
      return
    }
    let current = entry
    if (isDraft) {
      current = await handleSave()
      if (!current) return
    }
    await runWorkflow("Submit", () => submitRevenueVoucher(current!.id))
  }

  async function handleConfirm() {
    if (!entry) return
    await runWorkflow("Confirm", () => confirmRevenueVoucher(entry.id))
  }

  async function handlePost() {
    if (!entry) return
    if (!canSubmitOrPost) {
      setError("Revenue voucher must have allocations before post.")
      return
    }
    await runWorkflow("Post", () => postRevenueVoucher(entry.id))
  }

  async function handleCancel() {
    if (!entry) return
    await runWorkflow("Cancel", () =>
      cancelRevenueVoucher(entry.id, {
        cancelReason: cancelReason.trim() || null,
      })
    )
  }

  async function handleDelete() {
    if (!entry) return
    setBusyAction("delete")
    setError(null)
    try {
      await deleteDraftRevenueVoucher(entry.id)
      router.push(listHref)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
      setBusyAction(null)
    }
  }

  const documentNo = formatRevenueVoucherDocumentNo(entry?.entryNo)
  const entryRefNo = formatRevEntryRefNo(entry?.entryNo)

  const postedJournalHref =
    entry?.postedJournalEntryId != null
      ? buildFinanceJournalInquiryPath(entry.postedJournalEntryId, currentReturnPath)
      : null

  const amountInWords = formatThaiBahtAmountInWords(creditTotal)
  const showNotBalanced = creditTotal > 0 && !totalsBalanced

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading revenue voucher…</p>
  }

  return (
    <div className="space-y-4" data-testid="revenue-voucher-editor">
      {(isPosted || isCancelled) && entry ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <FinanceDocumentCanonicalHeader
              legalEntityCode={legalEntityCode}
              entryType={REVENUE_VOUCHER_ENTRY_TYPE}
              documentNo={documentNo}
              entryDate={entryDate}
              status={entry.status}
              description={description}
              createdAt={entry.createdAt}
              submittedAt={entry.submittedAt}
              confirmedAt={entry.confirmedAt}
              postedAt={entry.postedAt}
              cancelledAt={entry.cancelledAt}
            />
            <div className="flex flex-col items-end gap-2">
              {isPosted && postedJournalHref ? (
                <Link
                  href={postedJournalHref}
                  className={`text-sm ${themeLinkMuted}`}
                  data-testid="posted-journal-link"
                >
                  View posted GL journal
                </Link>
              ) : null}
              <Link
                href={listHref}
                className={`text-sm ${themeLinkMuted}`}
                data-testid="action-back"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`${financeDocumentContainer} space-y-3`}
          data-testid="rev-entry-shell"
        >
          <div
            className={`${financeAuditLine} flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm text-zinc-800`}
            data-testid="pav-entry-meta-row-1"
          >
            <span className="shrink-0">
              Ref. No.:{" "}
              <span className="font-mono font-medium" data-testid="pav-entry-ref-no">
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
                <span data-testid="pav-entry-date-prepared">
                  {formatFinanceDocumentDate(entryDate)}
                </span>
              )}
            </span>
          </div>

          <div
            className={`${financeAuditLine} pav-entry-meta-row-2 text-sm text-zinc-800`}
            data-testid="pav-entry-meta-row-2"
          >
            <div className="pav-entry-meta-field pav-entry-meta-pay-from">
              {canEditHeader ? (
                <select
                  className="pav-entry-meta-control rounded border border-zinc-300 px-2 py-0.5 text-sm disabled:bg-zinc-50"
                  value={receiveToAccountId}
                  onChange={(e) => handleReceiveToSelect(e.target.value)}
                  aria-label="Receive to account"
                  data-testid="field-receive-to-select"
                >
                  <option value="">Receive To Account</option>
                  {receiveToOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {formatRevReceiveToOptionLabel(option.code, option.name)}
                    </option>
                  ))}
                </select>
              ) : (
                <FinanceAccountDisplay
                  accountCode={receiveToAccountCode}
                  accountName={receiveToAccountName}
                  data-testid="field-receive-to-name"
                />
              )}
            </div>
            <div className="pav-entry-meta-field pav-entry-meta-cheque">
              {canEditHeader ? (
                <input
                  className="pav-entry-meta-control rounded border border-zinc-300 px-2 py-0.5 text-sm disabled:bg-zinc-50"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  placeholder="Receipt No."
                  data-testid="field-receipt-no"
                />
              ) : (
                <span data-testid="field-receipt-no-readonly">{receiptNo || "—"}</span>
              )}
            </div>
            <div className="pav-entry-meta-field pav-entry-meta-payee">
              {canEditHeader ? (
                <input
                  className="pav-entry-meta-control rounded border border-zinc-300 px-2 py-0.5 text-sm disabled:bg-zinc-50"
                  value={receivedFromName}
                  onChange={(e) => setReceivedFromName(e.target.value)}
                  placeholder="Received From"
                  data-testid="field-received-from-name"
                />
              ) : (
                <span data-testid="field-received-from-name-readonly">
                  {receivedFromName || "—"}
                </span>
              )}
            </div>
            <div className="pav-entry-meta-field pav-entry-meta-description">
              {canEditHeader ? (
                <input
                  className="pav-entry-meta-control rounded border border-zinc-300 px-2 py-0.5 text-sm disabled:bg-zinc-50"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  data-testid="field-description"
                />
              ) : (
                <span data-testid="field-description-readonly">{description || "—"}</span>
              )}
            </div>
          </div>

          {readOnly ? (
            <p className="text-sm text-zinc-600" data-testid="read-only-notice">
              This voucher is read-only in status{" "}
              {entry?.status
                ? formatRevenueVoucherStatusLabel(entry.status)
                : status}
              .
            </p>
          ) : null}

          <div className={financeTableScroll}>
            <table
              className={`${financeTable} pav-entry-lines-table`}
              data-testid="revenue-voucher-lines-table"
            >
              <colgroup>
                <col className="pav-col-account" />
                <col className="pav-col-debit" />
                <col className="pav-col-credit" />
                <col className="pav-col-memo" />
                {canEditLines ? <col className="pav-col-trash" /> : null}
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
                      <span className="text-zinc-400">—</span>
                    </td>
                    <td className={financeNumber}>
                      {canEditLines ? (
                        <input
                          className={`${themeInput} pav-line-field-input mt-0`}
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
                        formatAmount(row.credit)
                      )}
                    </td>
                    <td className={financeMemo}>
                      {canEditLines ? (
                        <input
                          className={`${themeInput} pav-line-field-input mt-0`}
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
                          <RevLineTrashIcon />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {showDerivedDebitLine ? (
                  <tr className="pav-derived-credit-row" data-testid="rev-derived-debit-line">
                    <td className={financeAccount}>
                      <span className="pav-derived-credit-account">
                        <FinanceAccountDisplay
                          accountCode={receiveToAccountCode}
                          accountName={receiveToAccountName}
                          data-testid="derived-debit-account"
                        />
                      </span>
                    </td>
                    <td className={financeNumber} data-testid="derived-debit-amount">
                      {formatAmount(String(creditTotal))}
                    </td>
                    <td className={financeNumber} />
                    <td className={financeMemo} />
                    {canEditLines ? <td /> : null}
                  </tr>
                ) : null}
              </tbody>
              <tfoot data-testid="rev-entry-totals">
                <tr className={financeTotalRowStrong}>
                  <td className={financeTotalLabel}>Total</td>
                  <td className={financeTotalValue} data-testid="line-total-debit">
                    {formatAmount(String(debitTotal))}
                  </td>
                  <td className={financeTotalValue} data-testid="line-total-credit">
                    {formatAmount(String(creditTotal))}
                  </td>
                  <td className={financeMemo} />
                  {canEditLines ? <td /> : null}
                </tr>
              </tfoot>
            </table>
          </div>

          {showNotBalanced ? (
            <p
              className={`text-sm font-medium ${financeDiffUnbalanced}`}
              data-testid="line-balance-status"
            >
              Not Balanced
            </p>
          ) : null}

          <div
            className="rounded border border-zinc-300 bg-zinc-50/60 px-3 py-2 text-sm text-zinc-800"
            data-testid="rev-amount-in-words"
          >
            {amountInWords}
          </div>

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
                  disabled={busyAction !== null || !canSubmitOrPost}
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
                  disabled={busyAction !== null || !canSubmitOrPost}
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
              ← Back
            </Link>
          </div>
        </div>
      )}

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
  )
}
