"use client"

import { useCallback, useEffect, useState } from "react"
import { MainMenuShell } from "@/components/main/MainMenuShell"
import { DaySalesSlideInPanel } from "@/components/shop/DaySalesSlideInPanel"
import { TargetActualCalendarGrid } from "@/components/shop/TargetActualCalendarGrid"
import { TargetSalesMonthSummary } from "@/components/shop/TargetSalesMonthSummary"
import { CompactControlRow } from "@/components/shop-ui/CompactControlRow"
import { CompactMonthSelect } from "@/components/shop-ui/CompactMonthSelect"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { SalesDashboardView } from "@/lib/shop/sales-dashboard-types"
import {
  ALL_COMPANY_SCOPE_VALUE,
  buildTargetActualCalendarGrid,
  TARGET_ACTUAL_DASHBOARD_HEADER_GRID,
} from "@/lib/shop-ui/sales-dashboard-calendar"
import { fetchSalesDashboard } from "@/lib/shop-ui/sales-dashboard-client"
import { compactHeaderFieldClass } from "@/lib/shop-ui/compact-form-helpers"
import { mainMenuLargePageTitleClass } from "@/lib/main-ui/main-menu-layout"
import { themeMuted } from "@/lib/theme/theme-classes"

const EMPTY_MONTH_SUMMARY = {
  lastMonthSales: "0.00",
  grossSales: "0.00",
  actualVat: "0.00",
  actualNet: "0.00",
  refunds: "0.00",
  netSales: "0.00",
  billCount: 0,
} as const

type TargetSalesDashboardPageProps = {
  user: SessionUserApi
}

export function TargetSalesDashboardPage({ user }: TargetSalesDashboardPageProps) {
  const now = new Date()
  const [scopeBranchId, setScopeBranchId] = useState(ALL_COMPANY_SCOPE_VALUE)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [yearToDate, setYearToDate] = useState(false)
  const [view, setView] = useState<SalesDashboardView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slideInOpen, setSlideInOpen] = useState(false)
  const [slideInDateKey, setSlideInDateKey] = useState("")

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchSalesDashboard({
      year,
      month,
      branchId: scopeBranchId || undefined,
      yearToDate,
    })
    if (!result.ok) {
      setError(result.error)
      setView(null)
      setLoading(false)
      return
    }
    setView(result.view)
    setLoading(false)
  }, [year, month, scopeBranchId, yearToDate])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  function handleActualClick(dateKey: string) {
    setSlideInDateKey(dateKey)
    setSlideInOpen(true)
  }

  const calendarCells =
    view != null
      ? buildTargetActualCalendarGrid({
          year: view.year,
          month: view.month,
          days: view.days,
        })
      : []

  const scopeOptions = view?.branches ?? []

  return (
    <MainMenuShell
      user={user}
      title="LAST MONTH / ACTUAL SALES"
      titleClassName={mainMenuLargePageTitleClass}
      backHref="/main/shop"
      backLabel="← Back to Shop"
    >
      <div data-testid="target-sales-dashboard">
        <CompactControlRow gridClassName={TARGET_ACTUAL_DASHBOARD_HEADER_GRID}>
          <select
            className={compactHeaderFieldClass}
            value={scopeBranchId}
            onChange={(event) => setScopeBranchId(event.target.value)}
            data-testid="dashboard-scope"
            aria-label="Scope"
          >
            <option value={ALL_COMPANY_SCOPE_VALUE}>All Company</option>
            {scopeOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} · {branch.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            className={`${compactHeaderFieldClass} tabular-nums`}
            value={year}
            min={2000}
            max={2100}
            onChange={(event) => setYear(Number(event.target.value))}
            data-testid="dashboard-year"
            aria-label="Year"
          />

          <CompactMonthSelect
            value={month}
            onChange={setMonth}
            data-testid="dashboard-month"
          />
        </CompactControlRow>

        {error ? (
          <p className="text-sm text-destructive" data-testid="dashboard-error">
            {error}
          </p>
        ) : null}

        <TargetSalesMonthSummary
          summary={view?.monthSummary ?? EMPTY_MONTH_SUMMARY}
          yearToDate={yearToDate}
          onYearToDateChange={setYearToDate}
        />

        {loading ? (
          <p className={`text-sm ${themeMuted}`} data-testid="dashboard-loading">
            Loading dashboard…
          </p>
        ) : null}

        {!loading && view ? (
          <TargetActualCalendarGrid
            cells={calendarCells}
            weekdayPatterns={view.previousMonthWeekdayPatterns}
            onActualClick={handleActualClick}
          />
        ) : null}
      </div>

      <DaySalesSlideInPanel
        open={slideInOpen}
        dateKey={slideInDateKey}
        scopeBranchId={scopeBranchId || null}
        onClose={() => setSlideInOpen(false)}
      />
    </MainMenuShell>
  )
}
