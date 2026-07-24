"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MainMenuShell } from "@/components/main/MainMenuShell"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { SalesTargetCalendarPreview } from "@/components/shop/SalesTargetCalendarPreview"
import { CompactControlRow } from "@/components/shop-ui/CompactControlRow"
import {
  CompactFieldBox,
  CompactInlineFieldBox,
} from "@/components/shop-ui/CompactFieldBox"
import { NumericEntryInput } from "@/components/shop-ui/NumericEntryInput"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { DEFAULT_WEEK_PATTERN } from "@/lib/shop/sales-target-types"
import type {
  DailyTargetSplit,
  SalesTargetBranchOption,
} from "@/lib/shop/sales-target-types"
import {
  WEEK_PATTERN_UI_LABELS,
  weekPatternBackendIndex,
} from "@/lib/shop-ui/sales-target-calendar"
import {
  compactHeaderFieldClass,
  compactNumericInputClass,
} from "@/lib/shop-ui/compact-form-helpers"
import {
  fetchPreviousMonthSalesTarget,
  fetchSalesTarget,
  fetchSalesTargetBranches,
  fetchSalesTargetPreview,
  saveSalesTarget,
} from "@/lib/shop-ui/sales-targets-client"
import {
  draftsToWeightPattern,
  editableFinancialValue,
  formatFinancialNumber,
  handleWeekPatternEnterKey,
  isAllowedFinancialDraft,
  isAllowedWeightDraft,
  normalizeFinancialForApi,
  normalizeWeightDraft,
  parseFinancialInput,
  handleTargetEnterKey,
  weightNumbersToDrafts,
} from "@/lib/shop-ui/sales-target-form-helpers"
import {
  friendlySalesTargetError,
  logSalesTargetError,
} from "@/lib/shop-ui/sales-target-ui-errors"
import {
  themeBtnPrimary,
  themeBtnSecondary,
  themeCard,
  themeInput,
  themeMuted,
} from "@/lib/theme/theme-classes"

type SalesTargetSetupPageProps = {
  user: SessionUserApi
  canEdit: boolean
}

function defaultPattern(): number[] {
  return [...DEFAULT_WEEK_PATTERN]
}

function defaultPatternDrafts(): string[] {
  return weightNumbersToDrafts(defaultPattern())
}

export function SalesTargetSetupPage({ user, canEdit }: SalesTargetSetupPageProps) {
  const [branches, setBranches] = useState<SalesTargetBranchOption[]>([])
  const [branchesLoaded, setBranchesLoaded] = useState(false)
  const [branchId, setBranchId] = useState("")
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [monthlyTotalApi, setMonthlyTotalApi] = useState("0")
  const [monthlyTotalDraft, setMonthlyTotalDraft] = useState("0")
  const [monthlyTotalFocused, setMonthlyTotalFocused] = useState(false)
  const [weekPatternDrafts, setWeekPatternDrafts] = useState<string[]>(
    defaultPatternDrafts
  )
  const [weekPatternCommitted, setWeekPatternCommitted] = useState<number[]>(
    defaultPattern
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewDays, setPreviewDays] = useState<DailyTargetSplit[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const monthlyTotalRef = useRef<HTMLInputElement>(null)
  const weekPatternRefs = useRef<Array<HTMLInputElement | null>>([])
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  const applyLoadedTarget = useCallback(
    (monthlyTotal: string, weekPattern: number[]) => {
      const apiMonthly = normalizeFinancialForApi(monthlyTotal)
      setMonthlyTotalApi(apiMonthly)
      setMonthlyTotalDraft(apiMonthly)
      setWeekPatternCommitted(weekPattern)
      setWeekPatternDrafts(weightNumbersToDrafts(weekPattern))
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await fetchSalesTargetBranches()
      if (cancelled) return
      setBranchesLoaded(true)
      if (!result.ok) {
        logSalesTargetError("branches", result.error)
        setError(friendlySalesTargetError(result.error, "branches"))
        return
      }
      setBranches(result.branches)
      setBranchId((prev) =>
        prev && result.branches.some((b) => b.id === prev)
          ? prev
          : result.branches[0]?.id ?? ""
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadTarget = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    setError(null)
    const result = await fetchSalesTarget({ branchId, year, month })
    if (!result.ok) {
      logSalesTargetError("load", result.error)
      setError(friendlySalesTargetError(result.error, "load"))
      setLoading(false)
      return
    }
    applyLoadedTarget(result.target.monthlyTotal, result.target.weekPattern)
    setLoading(false)
  }, [applyLoadedTarget, branchId, year, month])

  useEffect(() => {
    void loadTarget()
  }, [loadTarget])

  useEffect(() => {
    if (!branchId) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setPreviewLoading(true)
      const result = await fetchSalesTargetPreview({
        year,
        month,
        monthlyTotal: monthlyTotalApi,
        weekPattern: weekPatternCommitted,
      })
      if (cancelled) return
      if (result.ok) {
        setPreviewDays(result.days)
      } else {
        logSalesTargetError("preview", result.error)
        setError(friendlySalesTargetError(result.error, "preview"))
      }
      setPreviewLoading(false)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [branchId, year, month, monthlyTotalApi, weekPatternCommitted])

  function commitWeekPatternDraft(backendIndex: number): boolean {
    const draft = weekPatternDrafts[backendIndex] ?? ""
    const n = normalizeWeightDraft(draft)
    if (n === null) {
      setWeekPatternDrafts((prev) => {
        const next = [...prev]
        next[backendIndex] = weightNumbersToDrafts([
          weekPatternCommitted[backendIndex] ?? 1,
        ])[0]!
        return next
      })
      return false
    }
    setWeekPatternDrafts((prev) => {
      const next = [...prev]
      next[backendIndex] = String(n)
      return next
    })
    setWeekPatternCommitted((prev) => {
      const next = [...prev]
      next[backendIndex] = n
      return next
    })
    return true
  }

  function commitMonthlyTotalDraft(): boolean {
    const parsed = parseFinancialInput(
      monthlyTotalFocused ? monthlyTotalDraft : monthlyTotalApi
    )
    if (parsed === null) {
      setError("Monthly target must be a valid number")
      setMonthlyTotalDraft(monthlyTotalApi)
      return false
    }
    setMonthlyTotalApi(parsed)
    setMonthlyTotalDraft(parsed)
    return true
  }

  async function handleSave() {
    if (!branchId || !canEdit) return
    if (!commitMonthlyTotalDraft()) return

    const { pattern, invalidIndexes } = draftsToWeightPattern(
      weekPatternDrafts,
      weekPatternCommitted
    )
    if (invalidIndexes.length > 0) {
      setError("Complete all week pattern weights before saving")
      return
    }

    setSaving(true)
    setError(null)
    const result = await saveSalesTarget({
      branchId,
      year,
      month,
      monthlyTotal: monthlyTotalApi,
      weekPattern: pattern,
    })
    if (!result.ok) {
      logSalesTargetError("save", result.error)
      setError(friendlySalesTargetError(result.error, "save"))
      setSaving(false)
      return
    }
    applyLoadedTarget(result.target.monthlyTotal, result.target.weekPattern)
    setSaving(false)
  }

  async function handleCopyPreviousMonth() {
    if (!branchId || !canEdit) return
    setCopying(true)
    setError(null)
    const result = await fetchPreviousMonthSalesTarget({ branchId, year, month })
    if (!result.ok) {
      logSalesTargetError("copy", result.error)
      setError(friendlySalesTargetError(result.error, "copy"))
      setCopying(false)
      return
    }
    if (!result.target.exists) {
      setCopying(false)
      return
    }
    applyLoadedTarget(result.target.monthlyTotal, result.target.weekPattern)
    setCopying(false)
  }

  const monthlyInputValue = monthlyTotalFocused
    ? monthlyTotalDraft
    : formatFinancialNumber(monthlyTotalApi)

  const numericInputClass = `${themeInput} mt-0 ${compactNumericInputClass}`

  return (
    <MainMenuShell
      user={user}
      title="Sales Target Setup"
      backHref="/main/shop"
      backLabel="← Back to Shop"
    >
      {!canEdit ? (
        <p className={`mt-2 text-xs ${themeMuted}`} role="status">
          View only — contact HO Admin or Finance to edit targets.
        </p>
      ) : null}

      <div className={`mt-3 space-y-2 ${themeCard} p-3`}>
        <CompactControlRow testId="sales-target-header-row">
          <div className="min-w-0">
            {branchesLoaded && branches.length === 0 ? (
              <p
                className={`${numericInputClass} py-2 text-amber-700`}
                role="status"
              >
                No active shop branches found
              </p>
            ) : (
              <BranchSelect
                value={branchId}
                onChange={setBranchId}
                options={branches}
                emptyOption={!branchId ? { label: "Select branch" } : false}
                selectClassName={`${compactHeaderFieldClass} sales-target-header-control`}
                disabled={loading || branches.length === 0}
                aria-label="Branch"
                formatOptionLabel={(branch) => `${branch.code} — ${branch.name}`}
                data-testid="sales-target-header-control"
              />
            )}
          </div>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={`${compactHeaderFieldClass} tabular-nums sales-target-header-control`}
            disabled={loading || !canEdit || !branchId}
            aria-label="Year"
            data-testid="sales-target-header-control"
          />

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={`${compactHeaderFieldClass} px-1 text-center tabular-nums sales-target-header-control`}
            disabled={loading || !canEdit || !branchId}
            aria-label="Month"
            data-testid="sales-target-month-select"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <CompactFieldBox
            label="Target"
            testId="sales-target-amount-field"
            className="sales-target-header-control"
          >
            <NumericEntryInput
              ref={monthlyTotalRef}
              embedded
              align="right"
              value={monthlyInputValue}
              onValueChange={(next) => {
                if (!isAllowedFinancialDraft(next)) return
                setMonthlyTotalDraft(next)
                const parsed = parseFinancialInput(next)
                if (parsed !== null) {
                  setMonthlyTotalApi(parsed)
                }
              }}
              onFocus={() => {
                setMonthlyTotalFocused(true)
                setMonthlyTotalDraft(
                  editableFinancialValue(formatFinancialNumber(monthlyTotalApi))
                )
              }}
              onBlur={() => {
                setMonthlyTotalFocused(false)
                commitMonthlyTotalDraft()
              }}
              onEnterFocusNext={weekPatternRefs.current[0] ?? null}
              className="font-semibold"
              disabled={loading || !canEdit || !branchId}
              aria-label="Target"
            />
          </CompactFieldBox>
        </CompactControlRow>

        <div className="grid grid-cols-7 gap-1">
          {WEEK_PATTERN_UI_LABELS.map((label, uiIndex) => {
            const backendIndex = weekPatternBackendIndex(uiIndex)
            return (
              <CompactInlineFieldBox key={label} label={label}>
                <NumericEntryInput
                  ref={(el) => {
                    weekPatternRefs.current[uiIndex] = el
                  }}
                  embedded
                  align="center"
                  value={weekPatternDrafts[backendIndex] ?? ""}
                  onValueChange={(next) => {
                    if (!isAllowedWeightDraft(next)) return
                    setWeekPatternDrafts((prev) => {
                      const copy = [...prev]
                      copy[backendIndex] = next
                      return copy
                    })
                    const n = normalizeWeightDraft(next)
                    if (n !== null) {
                      setWeekPatternCommitted((prev) => {
                        const copy = [...prev]
                        copy[backendIndex] = n
                        return copy
                      })
                    }
                  }}
                  onBlur={() => {
                    commitWeekPatternDraft(backendIndex)
                  }}
                  onKeyDown={(e) =>
                    handleWeekPatternEnterKey(
                      e,
                      uiIndex,
                      weekPatternRefs.current,
                      saveButtonRef.current
                    )
                  }
                  className="py-1.5 pr-1.5"
                  disabled={loading || !canEdit || !branchId}
                  aria-label={`${label} weight`}
                />
              </CompactInlineFieldBox>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <button
                ref={saveButtonRef}
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loading || copying || !branchId}
                className={themeBtnPrimary}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => void handleCopyPreviousMonth()}
                disabled={saving || loading || copying || !branchId}
                className={themeBtnSecondary}
                title="Load monthly target and week pattern from the previous month (same branch). Does not save."
              >
                {copying ? "Copying…" : "Copy Previous Month"}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => void loadTarget()}
            disabled={loading || !branchId}
            className={themeBtnSecondary}
            title="Reload the selected branch/year/month from the database and discard unsaved edits."
          >
            Reload
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            data-testid="sales-target-error"
            className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-700"
          >
            {error}
          </p>
        ) : null}

        <SalesTargetCalendarPreview
          embedded
          year={year}
          month={month}
          days={previewDays}
          weekPattern={weekPatternCommitted}
          loading={previewLoading}
        />
      </div>
    </MainMenuShell>
  )
}
