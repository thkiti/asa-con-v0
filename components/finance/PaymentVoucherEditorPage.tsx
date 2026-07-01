"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { FinanceDocumentCanonicalHeader } from "@/components/finance/FinanceDocumentCanonicalHeader"
import { FinanceDocumentSummaryRow } from "@/components/finance/FinanceDocumentSummaryRow"
import { FinanceVoucherPostedPrintView } from "@/components/finance/FinanceVoucherPostedPrintView"
import { MjvLineAccountInput } from "@/components/finance/MjvLineAccountInput"
import { formatFinanceDocumentDate } from "@/lib/finance-ui/finance-document-display"
import { formatFinanceBranchLabel } from "@/lib/finance-ui/finance-branch-display"
import { financePostedDocumentScreenProps } from "@/lib/finance-ui/finance-posted-document-layout"
import { buildFinanceVoucherPrintModelFromPaymentVoucher } from "@/lib/finance-ui/finance-voucher-print"
import { buildFinanceJournalInquiryPath } from "@/lib/finance-ui/finance-navigation"
import { formatAmount } from "@/lib/finance-ui/format"
import { formatThaiBahtAmountInWords } from "@/lib/finance-ui/format-thai-baht-words"
import { fetchGlAccounts } from "@/lib/finance-ui/gl-accounts"
import { fetchManualJournalSessionContext } from "@/lib/finance-ui/manual-journal-entry-session"
import {
  computePaymentVoucherLineTotals,
  formatPavEntryRefNo,
  formatPaymentVoucherDocumentNo,
  formatPaymentVoucherStatusLabel,
  parsePaymentVoucherAmount,
  PAYMENT_VOUCHER_ENTRY_TYPE,
  type PaymentVoucherStatusCode,
} from "@/lib/finance-ui/payment-voucher-display"
import {
  filterPavPayFromAccountOptions,
  formatPavPayFromOptionLabel,
  type PavPayFromAccountOption,
} from "@/lib/finance-ui/pav-pay-from-accounts"
import {
  cancelPaymentVoucher,
  confirmPaymentVoucher,
  createPaymentVoucherDraft,
  deleteDraftPaymentVoucher,
  fetchPaymentVoucher,
  postPaymentVoucher,
  submitPaymentVoucher,
  updatePaymentVoucherDraft,
  type PaymentVoucherRead,
} from "@/lib/finance-ui/payment-vouchers"
import { useFinanceCurrentReturnPath } from "@/lib/finance-ui/use-finance-current-return-path"
import { useFinanceVoucherAutoprint } from "@/lib/finance-ui/use-finance-voucher-autoprint"
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
import type { Role } from "@/lib/shared"

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

function linesFromEntry(entry: PaymentVoucherRead): LineRow[] {
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
        parsePaymentVoucherAmount(line.debit) > 0 ||
        parsePaymentVoucherAmount(line.credit) > 0
    )
}

function countActivePaymentVoucherLines(lines: LineRow[]): number {
  return lines.filter(
    (line) =>
      line.accountCode.trim() ||
      parsePaymentVoucherAmount(line.debit) > 0 ||
      parsePaymentVoucherAmount(line.credit) > 0
  ).length
}

function editorSeed(initialEntry: PaymentVoucherRead | null) {
  if (!initialEntry) {
    return {
      entry: null as PaymentVoucherRead | null,
      branchId: "",
      legalEntityCode: "AS" as DocumentEntityCode,
      entryDate: new Date().toISOString().slice(0, 10),
      payFromAccountId: "",
      payFromAccountCode: "",
      payFromAccountName: "",
      payeeName: "",
      refNo: "",
      chequeNo: "",
      description: "",
      lines: [emptyLine(), emptyLine()],
    }
  }
  return {
    entry: initialEntry,
    branchId: initialEntry.branchId,
    legalEntityCode: initialEntry.legalEntityCode as DocumentEntityCode,
    entryDate: initialEntry.entryDate.slice(0, 10),
    payFromAccountId: initialEntry.payFromAccountId,
    payFromAccountCode: initialEntry.payFromAccountCode,
    payFromAccountName: initialEntry.payFromAccountName,
    payeeName: initialEntry.payeeName,
    refNo: initialEntry.refNo ?? "",
    chequeNo: initialEntry.chequeNo ?? "",
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

function PavLineTrashIcon() {
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

type PaymentVoucherEditorPageProps = {
  mode: "create" | "edit"
  entryId?: string
  initialEntry?: PaymentVoucherRead | null
}

export function PaymentVoucherEditorPage({
  mode,
  entryId,
  initialEntry = null,
}: PaymentVoucherEditorPageProps) {
  const router = useRouter()
  const currentReturnPath = useFinanceCurrentReturnPath()
  const listHref = "/finance/payment-vouchers"
  const seed = editorSeed(initialEntry)

  const [loading, setLoading] = useState(mode === "edit" && !initialEntry)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [entry, setEntry] = useState<PaymentVoucherRead | null>(seed.entry)
  const [branchId, setBranchId] = useState(seed.branchId)
  const [legalEntityCode, setLegalEntityCode] = useState<DocumentEntityCode>(
    seed.legalEntityCode
  )
  const [entryDate, setEntryDate] = useState(seed.entryDate)
  const [payFromAccountId, setPayFromAccountId] = useState(seed.payFromAccountId)
  const [payFromAccountCode, setPayFromAccountCode] = useState(seed.payFromAccountCode)
  const [payFromAccountName, setPayFromAccountName] = useState(seed.payFromAccountName)
  const [payeeName, setPayeeName] = useState(seed.payeeName)
  const [refNo, setRefNo] = useState(seed.refNo)
  const [chequeNo, setChequeNo] = useState(seed.chequeNo)
  const [description, setDescription] = useState(seed.description)
  const [lines, setLines] = useState<LineRow[]>(seed.lines)
  const [cancelReason, setCancelReason] = useState("")
  const [showCancelReason, setShowCancelReason] = useState(false)
  const [branchLabel, setBranchLabel] = useState("")
  const [sessionRole, setSessionRole] = useState<Role | "">("")
  const [payFromOptions, setPayFromOptions] = useState<PavPayFromAccountOption[]>([])
  const [focusedAccountLineKey, setFocusedAccountLineKey] = useState<string | null>(null)
  const accountEnterCommitRef = useRef<string | null>(null)

  const status: PaymentVoucherStatusCode | "NEW" =
    entry?.status ?? (mode === "create" ? "NEW" : "DRAFT")

  const isDraft = status === "DRAFT" || status === "NEW"
  const isSubmitted = status === "SUBMITTED"
  const isConfirmed = status === "CONFIRMED"
  const isPosted = status === "POSTED"
  useFinanceVoucherAutoprint(isPosted)
  const isCancelled = status === "CANCELLED"
  const readOnly = isPosted || isCancelled || isSubmitted || isConfirmed
  const canEditHeader = isDraft
  const canEditLines = isDraft

  const lineTotals = useMemo(() => computePaymentVoucherLineTotals(lines), [lines])
  const totalsBalanced = lineTotals.balanced
  const canSubmitOrPost =
    lineTotals.balanced &&
    lineTotals.debit > 0 &&
    countActivePaymentVoucherLines(lines) >= 2 &&
    payFromAccountId.trim().length > 0 &&
    payeeName.trim().length > 0

  const applyEntry = useCallback((loaded: PaymentVoucherRead) => {
    setEntry(loaded)
    setBranchId(loaded.branchId)
    setEntryDate(loaded.entryDate.slice(0, 10))
    setPayFromAccountId(loaded.payFromAccountId)
    setPayFromAccountCode(loaded.payFromAccountCode)
    setPayFromAccountName(loaded.payFromAccountName)
    setPayeeName(loaded.payeeName)
    setRefNo(loaded.refNo ?? "")
    setChequeNo(loaded.chequeNo ?? "")
    setDescription(loaded.description ?? "")
    setLines(linesFromEntry(loaded))
  }, [])

  useEffect(() => {
    void fetchManualJournalSessionContext().then((session) => {
      if (!session) return
      setLegalEntityCode(session.documentEntityCode)
      setSessionRole(session.role)
      if (mode === "create") {
        setBranchId(session.branchId)
      }
      setBranchLabel(
        formatFinanceBranchLabel({
          branchCode: session.branchCode,
          branchName: session.branchName,
        })
      )
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
      setPayFromOptions(filterPavPayFromAccountOptions(result.accounts))
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
    void fetchPaymentVoucher(entryId)
      .then(applyEntry)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load payment voucher")
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

  function handlePayFromSelect(accountId: string) {
    if (!accountId) {
      setPayFromAccountId("")
      setPayFromAccountCode("")
      setPayFromAccountName("")
      return
    }
    const option = payFromOptions.find((row) => row.id === accountId)
    if (!option) return
    setPayFromAccountId(option.id)
    setPayFromAccountCode(option.code)
    setPayFromAccountName(option.name)
  }

  async function ensurePayFromResolved(): Promise<boolean> {
    if (payFromAccountId.trim()) return true
    setError("Pay-from account is required.")
    return false
  }

  async function handleSave(): Promise<PaymentVoucherRead | null> {
    setError(null)
    setStatusMessage(null)

    if (!branchId.trim()) {
      setError("Branch is required.")
      return null
    }
    if (!payeeName.trim()) {
      setError("Payee is required.")
      return null
    }
    if (!(await ensurePayFromResolved())) {
      return null
    }

    const payloadLines = linesToPayload(lines)

    setBusyAction("save")
    try {
      if (mode === "create" || !entry) {
        const created = await createPaymentVoucherDraft({
          branchId: branchId.trim(),
          legalEntityCode,
          entryDate,
          payFromAccountId: payFromAccountId.trim(),
          payeeName: payeeName.trim(),
          description: description.trim() || null,
          refNo: refNo.trim() || null,
          chequeNo: chequeNo.trim() || null,
          lines: payloadLines,
        })
        applyEntry(created)
        setStatusMessage("Draft created.")
        router.replace(`${listHref}/${created.id}`)
        return created
      }

      const updated = await updatePaymentVoucherDraft(entry.id, {
        entryDate,
        payFromAccountId: payFromAccountId.trim(),
        payeeName: payeeName.trim(),
        description: description.trim() || null,
        refNo: refNo.trim() || null,
        chequeNo: chequeNo.trim() || null,
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
    fn: () => Promise<PaymentVoucherRead>
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
        "Enter pay-from account, payee, at least two lines, and balanced debit/credit totals before submit."
      )
      return
    }
    let current = entry
    if (isDraft) {
      current = await handleSave()
      if (!current) return
    }
    await runWorkflow("Submit", () => submitPaymentVoucher(current!.id))
  }

  async function handleConfirm() {
    if (!entry) return
    await runWorkflow("Confirm", () => confirmPaymentVoucher(entry.id))
  }

  async function handlePost() {
    if (!entry) return
    if (!canSubmitOrPost) {
      setError("Payment voucher must be balanced with at least two lines before post.")
      return
    }
    await runWorkflow("Post", () => postPaymentVoucher(entry.id))
  }

  async function handleCancel() {
    if (!entry) return
    await runWorkflow("Cancel", () =>
      cancelPaymentVoucher(entry.id, {
        cancelReason: cancelReason.trim() || null,
      })
    )
  }

  async function handleDelete() {
    if (!entry) return
    setBusyAction("delete")
    setError(null)
    try {
      await deleteDraftPaymentVoucher(entry.id)
      router.push(listHref)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
      setBusyAction(null)
    }
  }

  const documentNo = formatPaymentVoucherDocumentNo(entry?.entryNo)
  const entryRefNo = formatPavEntryRefNo(entry?.entryNo)

  const postedJournalHref =
    entry?.postedJournalEntryId != null
      ? buildFinanceJournalInquiryPath(entry.postedJournalEntryId, currentReturnPath)
      : null

  const voucherPrintModel =
    isPosted && entry
      ? buildFinanceVoucherPrintModelFromPaymentVoucher(entry, { branchLabel })
      : null

  const amountInWords = formatThaiBahtAmountInWords(lineTotals.debit)
  const showNotBalanced = lineTotals.debit > 0 || lineTotals.credit > 0 ? !totalsBalanced : false
  const canAdminRepairArchive = sessionRole === "HO_ADMIN"

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading payment voucher…</p>
  }

  return (
    <div className="w-full space-y-4" data-testid="payment-voucher-editor">
      {isPosted && entry && voucherPrintModel ? (
        <>
          <FinanceDocumentSummaryRow
            documentNo={documentNo}
            entryDate={entryDate}
            status={entry.status}
          />
          <FinanceVoucherPostedPrintView
            model={voucherPrintModel}
            entryType={PAYMENT_VOUCHER_ENTRY_TYPE}
            legalEntityCode={legalEntityCode}
            entryDate={entryDate}
            description={description}
            listHref={listHref}
            listBackLabel="Payment vouchers"
            postedJournalHref={postedJournalHref}
            disabled={busyAction !== null}
            {...financePostedDocumentScreenProps}
            archiveVault={{
              documentKind: "PAV",
              documentId: entry.id,
              documentNo: documentNo,
              legalEntityCode,
              branchId: entry.branchId,
              workflowStatus: entry.status,
            }}
            archiveVaultAdminRepair={canAdminRepairArchive}
          />
        </>
      ) : isCancelled && entry ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <FinanceDocumentCanonicalHeader
              legalEntityCode={legalEntityCode}
              entryType={PAYMENT_VOUCHER_ENTRY_TYPE}
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
            <Link
              href={listHref}
              className={`text-sm ${themeLinkMuted}`}
              data-testid="action-back"
            >
              ← Back
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={`${financeDocumentContainer} space-y-3`}
          data-testid="pav-entry-shell"
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
                  value={payFromAccountId}
                  onChange={(e) => handlePayFromSelect(e.target.value)}
                  aria-label="Pay from account"
                  data-testid="field-pay-from-select"
                >
                  <option value="">Pay From Account</option>
                  {payFromOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {formatPavPayFromOptionLabel(option.code, option.name)}
                    </option>
                  ))}
                </select>
              ) : (
                <FinanceAccountDisplay
                  accountCode={payFromAccountCode}
                  accountName={payFromAccountName}
                  data-testid="field-pay-from-name"
                />
              )}
            </div>
            <div className="pav-entry-meta-field pav-entry-meta-cheque">
              {canEditHeader ? (
                <input
                  className="pav-entry-meta-control rounded border border-zinc-300 px-2 py-0.5 text-sm disabled:bg-zinc-50"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  placeholder="Cheque No."
                  data-testid="field-cheque-no"
                />
              ) : (
                <span data-testid="field-cheque-no-readonly">{chequeNo || "—"}</span>
              )}
            </div>
            <div className="pav-entry-meta-field pav-entry-meta-payee">
              {canEditHeader ? (
                <input
                  className="pav-entry-meta-control rounded border border-zinc-300 px-2 py-0.5 text-sm disabled:bg-zinc-50"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="Payee"
                  data-testid="field-payee-name"
                />
              ) : (
                <span data-testid="field-payee-name-readonly">{payeeName || "—"}</span>
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
                ? formatPaymentVoucherStatusLabel(entry.status)
                : status}
              .
            </p>
          ) : null}

          <div className={financeTableScroll}>
            <table
              className={`${financeTable} pav-entry-lines-table`}
              data-testid="payment-voucher-lines-table"
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
                      {canEditLines ? (
                        <input
                          className={`${themeInput} pav-line-field-input mt-0`}
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
                        formatAmount(row.debit)
                      )}
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
                          <PavLineTrashIcon />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot data-testid="pav-entry-totals">
                <tr className={financeTotalRowStrong}>
                  <td className={financeTotalLabel}>Total</td>
                  <td className={financeTotalValue} data-testid="line-total-debit">
                    {formatAmount(String(lineTotals.debit))}
                  </td>
                  <td className={financeTotalValue} data-testid="line-total-credit">
                    {formatAmount(String(lineTotals.credit))}
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
            data-testid="pav-amount-in-words"
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
