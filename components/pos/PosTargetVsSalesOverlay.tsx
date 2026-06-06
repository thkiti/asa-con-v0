"use client"

import { useEffect, useState } from "react"
import type { PosTargetVsSalesSummary } from "@/lib/pos/target-vs-sales-types"
import { fetchPosTargetVsSales } from "@/lib/pos-ui/target-vs-sales-client"
import {
  formatFinancialCellValue,
  formatFinancialNumber,
  SUNDAY_FIRST_WEEKDAY_HEADERS,
} from "@/lib/shop-ui/compact-form-helpers"
import { bangkokWeekdaySun0 } from "@/lib/shop-ui/sales-target-calendar"

const POS_TVS_SUMMARY_VALUE =
  "shrink-0 text-right text-lg font-bold tabular-nums sm:text-xl"
const POS_TVS_TARGET_VALUE = `${POS_TVS_SUMMARY_VALUE} text-zinc-400`
const POS_TVS_ACTUAL_VALUE = `${POS_TVS_SUMMARY_VALUE} text-emerald-400`
const POS_TVS_ACHIEVEMENT_VALUE = `${POS_TVS_SUMMARY_VALUE} text-zinc-100`

type PosTargetVsSalesCalendarProps = {
  days: PosTargetVsSalesSummary["days"]
}

function buildPosCalendarCells(days: PosTargetVsSalesSummary["days"]) {
  if (days.length === 0) return []
  const first = days[0]!
  const year = Number(first.dateKey.slice(0, 4))
  const month = Number(first.dateKey.slice(5, 7))
  const leadingPads = bangkokWeekdaySun0(year, month, 1)

  type Cell =
    | { kind: "empty"; key: string }
    | {
        kind: "day"
        key: string
        cell: PosTargetVsSalesSummary["days"][number]
        weekdaySun0: number
      }

  const cells: Cell[] = []
  for (let i = 0; i < leadingPads; i++) {
    cells.push({ kind: "empty", key: `pad-${i}` })
  }
  for (const cell of days) {
    cells.push({
      kind: "day",
      key: cell.dateKey,
      cell,
      weekdaySun0: bangkokWeekdaySun0(year, month, cell.day),
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ kind: "empty", key: `pad-end-${cells.length}` })
  }
  return cells
}

function CalendarMetricRow({
  label,
  value,
  valueClassName,
  testId,
}: {
  label: "T" | "A"
  value: string
  valueClassName: string
  testId?: string
}) {
  return (
    <div
      className="flex items-center justify-between gap-0.5 whitespace-nowrap text-[10px] leading-tight sm:text-xs"
      data-testid={testId}
    >
      <span
        className={
          label === "T"
            ? "shrink-0 font-medium text-zinc-500"
            : "shrink-0 font-semibold text-emerald-500/90"
        }
      >
        {label}
      </span>
      <span className={`min-w-0 truncate text-right tabular-nums ${valueClassName}`}>
        {value}
      </span>
    </div>
  )
}

function PosTargetVsSalesCalendar({ days }: PosTargetVsSalesCalendarProps) {
  const cells = buildPosCalendarCells(days)

  return (
    <div
      className="grid w-full grid-cols-7 gap-px rounded border border-zinc-600 bg-zinc-600"
      role="grid"
      aria-label="Monthly target vs actual calendar"
      data-testid="pos-target-vs-sales-calendar"
    >
      {SUNDAY_FIRST_WEEKDAY_HEADERS.map((label) => (
        <div
          key={label}
          role="columnheader"
          className="bg-zinc-800 px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400 sm:text-xs"
        >
          {label}
        </div>
      ))}

      {cells.map((cell) => {
        if (cell.kind === "empty") {
          return (
            <div
              key={cell.key}
              role="gridcell"
              aria-hidden
              className="min-h-[3.25rem] bg-zinc-900/60 sm:min-h-[3.5rem]"
            />
          )
        }

        const { cell: dayCell, weekdaySun0 } = cell
        const isWeekend = weekdaySun0 === 0 || weekdaySun0 === 6
        return (
          <div
            key={cell.key}
            role="gridcell"
            data-testid={`pos-tvs-cell-${dayCell.dateKey}`}
            className={`flex min-h-[3.25rem] flex-col justify-between px-1 py-1 sm:min-h-[3.5rem] sm:px-1.5 sm:py-1.5 ${
              dayCell.isToday
                ? "bg-zinc-800 ring-1 ring-inset ring-amber-500/70"
                : "bg-zinc-900"
            }`}
          >
            <span
              className={`text-[11px] tabular-nums leading-none sm:text-xs ${
                isWeekend
                  ? "font-semibold text-zinc-500"
                  : "font-medium text-zinc-400"
              }`}
            >
              {dayCell.day}
            </span>
            <div className="flex flex-col gap-0.5">
              <CalendarMetricRow
                label="T"
                value={formatFinancialCellValue(dayCell.target)}
                valueClassName="font-semibold text-zinc-500"
                testId={`pos-tvs-cell-t-${dayCell.dateKey}`}
              />
              <CalendarMetricRow
                label="A"
                value={formatFinancialCellValue(dayCell.actual)}
                valueClassName="font-bold text-emerald-400"
                testId={`pos-tvs-cell-a-${dayCell.dateKey}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatSummaryAmount(value: string | null | undefined): string {
  if (value == null) return "—"
  return formatFinancialNumber(value)
}

function formatAchievement(value: string | null | undefined): string {
  if (value == null || value === "") return "—"
  return `${value}%`
}

function formatBranchTitle(branchCode: string, branchName: string): string {
  const code = branchCode.trim()
  const name = branchName.trim()
  if (code && name) return `${code} • ${name}`
  return code || name
}

type SummaryCardProps = {
  label: string
  value: string
  valueClassName: string
  testId: string
}

function SummaryCard({ label, value, valueClassName, testId }: SummaryCardProps) {
  return (
    <div className="rounded border border-zinc-600 bg-zinc-800/90 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {label}
        </p>
        <p className={valueClassName} data-testid={testId}>
          {value}
        </p>
      </div>
    </div>
  )
}

type PosTargetVsSalesOverlayProps = {
  onClose: () => void
  branchCode?: string
  branchName?: string
}

export function PosTargetVsSalesOverlay({
  onClose,
  branchCode = "",
  branchName = "",
}: PosTargetVsSalesOverlayProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<PosTargetVsSalesSummary | null>(null)

  const displayBranchCode = summary?.branchCode || branchCode
  const branchTitle = formatBranchTitle(displayBranchCode, branchName)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const result = await fetchPosTargetVsSales()
      if (cancelled) return
      if (!result.ok) {
        setError(result.error)
        setSummary(null)
        setLoading(false)
        return
      }
      setSummary(result.summary)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-target-vs-sales-title"
      data-testid="pos-target-vs-sales-overlay"
    >
      <div
        className="flex w-[72vw] max-w-[1400px] flex-col rounded-lg border border-zinc-600 bg-zinc-900 shadow-2xl sm:w-[75vw]"
        data-testid="pos-target-vs-sales-panel"
        style={{ maxHeight: "92vh" }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-700 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2
              id="pos-target-vs-sales-title"
              className="truncate text-lg font-bold text-zinc-100 sm:text-xl"
            >
              Target vs Sales
              {branchTitle ? (
                <span
                  className="font-semibold text-zinc-300"
                  data-testid="pos-target-vs-sales-branch-title"
                >
                  {" "}
                  · {branchTitle}
                </span>
              ) : null}
            </h2>
            {summary?.monthLabel ? (
              <p className="text-sm text-zinc-400">{summary.monthLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-zinc-500 bg-zinc-800 px-4 py-2 text-sm font-bold text-zinc-100 shadow-sm hover:bg-zinc-700"
            data-testid="pos-target-vs-sales-exit"
          >
            Exit
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:pb-5">
          {loading ? (
            <p className="text-sm text-zinc-400" data-testid="pos-target-vs-sales-loading">
              Loading…
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-400" data-testid="pos-target-vs-sales-error">
              {error}
            </p>
          ) : null}

          {summary ? (
            <>
              <section
                className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"
                data-testid="pos-target-vs-sales-summary"
              >
                <SummaryCard
                  label="Today Target"
                  value={formatSummaryAmount(summary.today.target)}
                  valueClassName={POS_TVS_TARGET_VALUE}
                  testId="pos-tvs-today-target"
                />
                <SummaryCard
                  label="Today Actual"
                  value={formatSummaryAmount(summary.today.actual)}
                  valueClassName={POS_TVS_ACTUAL_VALUE}
                  testId="pos-tvs-today-actual"
                />
                <SummaryCard
                  label="Month Target"
                  value={formatSummaryAmount(summary.month.target)}
                  valueClassName={POS_TVS_TARGET_VALUE}
                  testId="pos-tvs-month-target"
                />
                <SummaryCard
                  label="Month Actual"
                  value={formatSummaryAmount(summary.month.actual)}
                  valueClassName={POS_TVS_ACTUAL_VALUE}
                  testId="pos-tvs-month-actual"
                />
                <SummaryCard
                  label="Achievement %"
                  value={formatAchievement(summary.month.achievementPercent)}
                  valueClassName={POS_TVS_ACHIEVEMENT_VALUE}
                  testId="pos-tvs-achievement"
                />
              </section>

              <PosTargetVsSalesCalendar days={summary.days} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export {
  POS_TVS_ACTUAL_VALUE,
  POS_TVS_SUMMARY_VALUE,
  POS_TVS_TARGET_VALUE,
  formatBranchTitle,
}
