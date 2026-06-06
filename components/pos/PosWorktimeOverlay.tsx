"use client"

import { useCallback, useEffect, useState } from "react"
import type { PosWorktimeView } from "@/lib/pos/worktime-types"
import {
  fetchPosWorktime,
  postPosWorktimeIn,
  postPosWorktimeOut,
} from "@/lib/pos-ui/worktime-client"
import { SUNDAY_FIRST_WEEKDAY_HEADERS } from "@/lib/shop-ui/compact-form-helpers"
import { bangkokWeekdaySun0 } from "@/lib/shop-ui/sales-target-calendar"

function formatBranchTitle(branchCode: string, branchName: string): string {
  const code = branchCode.trim()
  const name = branchName.trim()
  if (code && name) return `${code} • ${name}`
  return code || name
}

function formatClockDisplay(value: string | null | undefined): string {
  if (value == null || value === "") return "-"
  return value
}

type WorktimeCalendarProps = {
  days: PosWorktimeView["days"]
}

function buildWorktimeCalendarCells(days: PosWorktimeView["days"]) {
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
        cell: PosWorktimeView["days"][number]
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

function ClockRow({
  label,
  value,
  testId,
}: {
  label: "IN" | "OUT"
  value: string
  testId?: string
}) {
  return (
    <div
      className="flex items-center justify-between gap-0.5 whitespace-nowrap text-[10px] leading-tight sm:text-xs"
      data-testid={testId}
    >
      <span
        className={
          label === "IN"
            ? "shrink-0 font-medium text-zinc-500"
            : "shrink-0 font-semibold text-emerald-500/90"
        }
      >
        {label}
      </span>
      <span
        className={`min-w-0 truncate text-right tabular-nums font-bold ${
          label === "IN" ? "text-zinc-300" : "text-emerald-400"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function PosWorktimeCalendar({ days }: WorktimeCalendarProps) {
  const cells = buildWorktimeCalendarCells(days)

  return (
    <div
      className="grid w-full grid-cols-7 gap-px rounded border border-zinc-600 bg-zinc-600"
      role="grid"
      aria-label="Monthly work time calendar"
      data-testid="pos-worktime-calendar"
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
            data-testid={`pos-worktime-cell-${dayCell.dateKey}`}
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
              <ClockRow
                label="IN"
                value={formatClockDisplay(dayCell.clockIn)}
                testId={`pos-worktime-in-${dayCell.dateKey}`}
              />
              <ClockRow
                label="OUT"
                value={formatClockDisplay(dayCell.clockOut)}
                testId={`pos-worktime-out-${dayCell.dateKey}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

type SummaryRowProps = {
  label: string
  value: string
  testId: string
}

function SummaryRow({ label, value, testId }: SummaryRowProps) {
  return (
    <div className="rounded border border-zinc-600 bg-zinc-800/90 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-400">{label}</p>
        <p
          className="shrink-0 text-right text-lg font-bold tabular-nums text-zinc-100 sm:text-xl"
          data-testid={testId}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

type PosWorktimeOverlayProps = {
  onClose: () => void
  branchCode?: string
  branchName?: string
}

export function PosWorktimeOverlay({
  onClose,
  branchCode = "",
  branchName = "",
}: PosWorktimeOverlayProps) {
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<PosWorktimeView | null>(null)

  const displayBranchCode = view?.branchCode || branchCode
  const branchTitle = formatBranchTitle(displayBranchCode, branchName)

  const loadView = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchPosWorktime()
    if (!result.ok) {
      setError(result.error)
      setView(null)
      setLoading(false)
      return
    }
    setView(result.view)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadView()
  }, [loadView])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  async function handleClockIn() {
    if (actionPending) return
    setActionPending(true)
    setError(null)
    const result = await postPosWorktimeIn()
    if (!result.ok) {
      setError(result.error)
    } else {
      setView(result.view)
    }
    setActionPending(false)
  }

  async function handleClockOut() {
    if (actionPending) return
    setActionPending(true)
    setError(null)
    const result = await postPosWorktimeOut()
    if (!result.ok) {
      setError(result.error)
    } else {
      setView(result.view)
    }
    setActionPending(false)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-worktime-title"
      data-testid="pos-worktime-overlay"
    >
      <div
        className="flex w-[72vw] max-w-[1400px] flex-col rounded-lg border border-zinc-600 bg-zinc-900 shadow-2xl sm:w-[75vw]"
        data-testid="pos-worktime-panel"
        style={{ maxHeight: "92vh" }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-700 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2
              id="pos-worktime-title"
              className="truncate text-lg font-bold text-zinc-100 sm:text-xl"
            >
              WorkTime IN/OUT
              {branchTitle ? (
                <span
                  className="font-semibold text-zinc-300"
                  data-testid="pos-worktime-branch-title"
                >
                  {" "}
                  · {branchTitle}
                </span>
              ) : null}
            </h2>
            {view?.monthLabel ? (
              <p className="text-sm text-zinc-400">{view.monthLabel}</p>
            ) : null}
          </div>
          <div
            className="flex shrink-0 items-center gap-2"
            data-testid="pos-worktime-actions"
          >
            <button
              type="button"
              onClick={() => void handleClockIn()}
              disabled={actionPending || loading}
              className="rounded-md border border-emerald-600/60 bg-emerald-900/40 px-4 py-2 text-sm font-bold text-emerald-300 shadow-sm hover:bg-emerald-900/60 disabled:opacity-50"
              data-testid="pos-worktime-in-btn"
            >
              IN
            </button>
            <button
              type="button"
              onClick={() => void handleClockOut()}
              disabled={actionPending || loading}
              className="rounded-md border border-emerald-600/60 bg-emerald-900/40 px-4 py-2 text-sm font-bold text-emerald-300 shadow-sm hover:bg-emerald-900/60 disabled:opacity-50"
              data-testid="pos-worktime-out-btn"
            >
              OUT
            </button>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md border border-zinc-500 bg-zinc-800 px-4 py-2 text-sm font-bold text-zinc-100 shadow-sm hover:bg-zinc-700"
              data-testid="pos-worktime-exit"
            >
              EXIT
            </button>
          </div>
        </header>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:pb-4">
          {loading ? (
            <p className="text-sm text-zinc-400" data-testid="pos-worktime-loading">
              Loading…
            </p>
          ) : null}
          {error ? (
            <p className="mb-3 text-sm text-red-400" data-testid="pos-worktime-error">
              {error}
            </p>
          ) : null}

          {view ? (
            <>
              <section
                className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3"
                data-testid="pos-worktime-summary"
              >
                <SummaryRow
                  label="จำนวนวันทำงาน"
                  value={`${view.summary.workDays} วัน`}
                  testId="pos-worktime-work-days"
                />
                <SummaryRow
                  label="รวมทั้งสิ้น"
                  value={`${view.summary.totalHours} ชั่วโมง`}
                  testId="pos-worktime-total-hours"
                />
                <SummaryRow
                  label="In-complete Record"
                  value={`${view.summary.incompleteDays} วัน`}
                  testId="pos-worktime-incomplete-days"
                />
              </section>

              <PosWorktimeCalendar days={view.days} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export { formatBranchTitle as formatWorktimeBranchTitle }
