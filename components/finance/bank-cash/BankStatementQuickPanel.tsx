"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import type { AmountMatchSummary } from "@/lib/finance/bank-statement-match"
import {
  formatGroupedMatchTooltip,
  isGroupedMatch,
  journalLineIdForStatementLine,
  matchGroupForStatementLine,
} from "@/lib/finance/bank-statement-match"
import type { BankStatementDetail } from "@/lib/finance/bank-statement/bank-statement-types"
import {
  applyEnterToAddLine,
  removeQuickLine,
  updateQuickLineAmount,
  type QuickAmountField,
} from "@/lib/finance-ui/bank-cash-quick-input"
import {
  COMPLETE_CHECK_DISABLED_TOOLTIP,
  quickLineHasAmount,
  type QuickStatementLine,
} from "@/lib/finance-ui/bank-cash-workspace"
import { buildGeneralLedgerRefPath } from "@/lib/finance-ui/general-ledger-display"
import { formatAmount } from "@/lib/finance-ui/format"
import { useFinanceEntityPathBuilder } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterInput,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeBtnSecondary, themeInlineError, themeTextSecondary } from "@/lib/theme/theme-classes"

export type MatchedJournalLineRef = {
  journalLineId: string
  journalEntryId: string
  entryNo: string
  sourceRef: string | null
  sourceRefType: string | null
}

type BankStatementQuickPanelProps = {
  detail: BankStatementDetail | null
  lines: QuickStatementLine[]
  matchSummary: AmountMatchSummary
  matchedJournalLines: Record<string, MatchedJournalLineRef>
  returnTo: string
  readOnly: boolean
  saving: boolean
  completingCheck: boolean
  canCompleteCheck: boolean
  error: string | null
  onLinesChange: (lines: QuickStatementLine[]) => void
  onSave: () => void
  onCompleteCheck: () => void
  onAddLine: () => void
}

function statementRowClass(line: QuickStatementLine, matchSummary: AmountMatchSummary): string {
  const lineId = line.serverId ?? line.key
  if (!quickLineHasAmount(line)) return ""
  if (matchSummary.matchedStatementLineIds.includes(lineId)) {
    return "opacity-[0.85] font-normal"
  }
  return "font-semibold bg-amber-50/60 dark:bg-amber-950/20"
}

function statementAmountInputClass(
  line: QuickStatementLine,
  matchSummary: AmountMatchSummary
): string {
  const base = `${voucherInquiryFilterInput} w-full text-right tabular-nums font-normal`
  const lineId = line.serverId ?? line.key
  if (quickLineHasAmount(line) && !matchSummary.matchedStatementLineIds.includes(lineId)) {
    return `${base} font-semibold`
  }
  return base
}

function MatchCell({
  line,
  matchSummary,
  matchedJournalLines,
  returnTo,
}: {
  line: QuickStatementLine
  matchSummary: AmountMatchSummary
  matchedJournalLines: Record<string, MatchedJournalLineRef>
  returnTo: string
}) {
  const lineId = line.serverId ?? line.key
  if (!quickLineHasAmount(line)) return null

  const journalLineId = journalLineIdForStatementLine(matchSummary, lineId)
  const journalLine = journalLineId ? matchedJournalLines[journalLineId] : undefined
  const group = matchGroupForStatementLine(matchSummary, lineId)

  if (journalLine && group) {
    const journalLabels = Object.fromEntries(
      group.journalLineIds.map((id) => [id, matchedJournalLines[id]?.entryNo ?? id])
    )
    const tooltip = isGroupedMatch(group)
      ? formatGroupedMatchTooltip(group, journalLabels)
      : "Open matched voucher"

    return (
      <Link
        href={buildGeneralLedgerRefPath(
          {
            journalEntryId: journalLine.journalEntryId,
            entryNo: journalLine.entryNo,
            sourceRef: journalLine.sourceRef,
            sourceRefType: journalLine.sourceRefType,
            sourceRefId: null,
            voucherId: null,
          },
          returnTo
        )}
        title={tooltip}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-normal text-white no-underline hover:bg-emerald-700"
        data-testid={`statement-match-open-${lineId}`}
      >
        ✓
      </Link>
    )
  }

  return (
    <span
      title="No matching journal entry found."
      aria-label="No matching journal entry found."
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
      data-testid={`statement-match-indicator-${lineId}`}
    >
      ⚠
    </span>
  )
}

export function BankStatementQuickPanel({
  detail,
  lines,
  matchSummary,
  matchedJournalLines,
  returnTo,
  readOnly,
  saving,
  completingCheck,
  canCompleteCheck,
  error,
  onLinesChange,
  onSave,
  onCompleteCheck,
  onAddLine,
}: BankStatementQuickPanelProps) {
  const entityPath = useFinanceEntityPathBuilder()
  const inputRefs = useRef<Record<string, Partial<Record<QuickAmountField, HTMLInputElement | null>>>>({})
  const [focusRequest, setFocusRequest] = useState<{
    key: string
    field: QuickAmountField
  } | null>(null)

  const matchCounts = useMemo(() => {
    const withAmount = lines.filter(quickLineHasAmount).length
    const matched = matchSummary.matchedStatementLineIds.length
    return { withAmount, matched, unmatched: withAmount - matched }
  }, [lines, matchSummary.matchedStatementLineIds.length])

  useEffect(() => {
    if (!focusRequest) return
    const input = inputRefs.current[focusRequest.key]?.[focusRequest.field]
    input?.focus()
    setFocusRequest(null)
  }, [focusRequest, lines])

  const handleAmountChange = (key: string, field: QuickAmountField, value: string) => {
    onLinesChange(
      lines.map((line) =>
        line.key === key ? updateQuickLineAmount(line, field, value) : line
      )
    )
  }

  const handleAmountEnter = (
    key: string,
    field: QuickAmountField,
    amount: string
  ) => {
    if (readOnly) return
    const result = applyEnterToAddLine(lines, key, field, amount)
    if (!result) return
    onLinesChange(result.lines)
    setFocusRequest({ key: result.focusLineKey, field: result.focusField })
  }

  const handleRemoveLine = (key: string) => {
    onLinesChange(removeQuickLine(lines, key))
  }

  const setInputRef = (lineKey: string, field: QuickAmountField, node: HTMLInputElement | null) => {
    if (!inputRefs.current[lineKey]) {
      inputRefs.current[lineKey] = {}
    }
    inputRefs.current[lineKey][field] = node
  }

  return (
    <section className="space-y-3" data-testid="bank-statement-quick-panel">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-zinc-900 dark:text-foreground">
            Bank statement (paper)
          </h2>
          <div
            className="flex flex-wrap items-center gap-3 text-xs"
            data-testid="bank-statement-match-summary"
          >
            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              🟢 {matchCounts.matched} matched
            </span>
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              🟠 {matchCounts.unmatched} unmatched
            </span>
          </div>
        </div>
        {detail ? (
          <p className={`text-xs ${themeTextSecondary}`} data-testid="bank-statement-workspace-ref">
            {detail.statementNo} · {detail.status}
          </p>
        ) : null}
        <p className={`text-xs ${themeTextSecondary}`}>
          Type amounts and press Enter to add the next row. Matched rows open the voucher from
          the green check.
        </p>
      </header>

      {error ? (
        <p className={themeInlineError} data-testid="bank-statement-quick-error">
          {error}
        </p>
      ) : null}

      <div className={financeTableScroll}>
        <table className={financeTable} data-testid="bank-statement-quick-table">
          <thead>
            <tr>
              <th className={financeTh}>Deposit</th>
              <th className={financeThRight}>Withdrawal</th>
              <th className={financeTh}>Match</th>
              <th className={financeTh}>Remove</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.key}
                className={statementRowClass(line, matchSummary)}
                data-testid={`bank-statement-quick-line-${line.serverId ?? line.key}`}
              >
                  <td className={financeNumber}>
                    <input
                      ref={(node) => setInputRef(line.key, "deposit", node)}
                      type="text"
                      inputMode="decimal"
                      className={statementAmountInputClass(line, matchSummary)}
                      value={line.depositAmount}
                      onChange={(event) =>
                        handleAmountChange(line.key, "deposit", event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          handleAmountEnter(line.key, "deposit", line.depositAmount)
                        }
                      }}
                      disabled={readOnly}
                      placeholder="0.00"
                      data-testid={`statement-deposit-${line.key}`}
                    />
                  </td>
                  <td className={financeNumber}>
                    <input
                      ref={(node) => setInputRef(line.key, "withdrawal", node)}
                      type="text"
                      inputMode="decimal"
                      className={statementAmountInputClass(line, matchSummary)}
                      value={line.withdrawalAmount}
                      onChange={(event) =>
                        handleAmountChange(line.key, "withdrawal", event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          handleAmountEnter(line.key, "withdrawal", line.withdrawalAmount)
                        }
                      }}
                      disabled={readOnly}
                      placeholder="0.00"
                      data-testid={`statement-withdrawal-${line.key}`}
                    />
                  </td>
                  <td className={financeMemo}>
                    <MatchCell
                      line={line}
                      matchSummary={matchSummary}
                      matchedJournalLines={matchedJournalLines}
                      returnTo={returnTo}
                    />
                  </td>
                  <td className={financeMemo}>
                  {!readOnly && (lines.length > 1 || quickLineHasAmount(line)) ? (
                    <button
                      type="button"
                      className={`text-xs underline ${themeTextSecondary}`}
                      onClick={() => handleRemoveLine(line.key)}
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={themeBtnSecondary}
            onClick={onAddLine}
            data-testid="bank-statement-add-line"
          >
            Add amount
          </button>
          <button
            type="button"
            className={voucherInquiryFilterButtonPrimary}
            onClick={onSave}
            disabled={saving || completingCheck || !detail}
            data-testid="bank-statement-save"
          >
            {saving ? "Saving…" : "Save statement amounts"}
          </button>
          <span
            title={!canCompleteCheck ? COMPLETE_CHECK_DISABLED_TOOLTIP : undefined}
            className="inline-flex"
          >
            <button
              type="button"
              className={themeBtnSecondary}
              onClick={onCompleteCheck}
              disabled={!canCompleteCheck || saving || completingCheck || !detail}
              data-testid="bank-statement-complete-check"
            >
              {completingCheck ? "Completing…" : "Complete Check"}
            </button>
          </span>
        </div>
      ) : (
        <p className={`text-xs ${themeTextSecondary}`}>
          Statement is Ready — set status to Draft from the{" "}
          <a
            href={entityPath(`/finance/bank-statements/${detail?.id ?? ""}`)}
            className="underline"
          >
            statement register
          </a>{" "}
          to edit amounts.
        </p>
      )}

      {detail ? (
        <p className={`text-xs tabular-nums ${themeTextSecondary}`}>
          Opening {formatAmount(detail.openingBalance)} · Closing{" "}
          {formatAmount(detail.closingBalance)}
        </p>
      ) : null}
    </section>
  )
}
