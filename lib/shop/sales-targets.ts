import type { PrismaClient } from "@/generated/prisma/client"
import { BranchType } from "@/generated/prisma/client"
import {
  bangkokWeekdayLabel,
  bangkokWeekdayMon0,
  daysInCalendarMonth,
  monthDayKeys,
} from "@/lib/reporting/bangkok-calendar"
import { toDec, ZERO } from "@/lib/stock/decimal"
import { SalesTargetError } from "./sales-target-errors"
import {
  DEFAULT_WEEK_PATTERN,
  type BranchSalesTargetView,
  type DailyTargetSplit,
  type SalesTargetBranchOption,
} from "./sales-target-types"

export type { BranchSalesTargetView, DailyTargetSplit, SalesTargetBranchOption }
export { DEFAULT_WEEK_PATTERN }

type SalesTargetDb = Pick<PrismaClient, "branchSalesTarget" | "branch">

function assertYear(year: number): void {
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new SalesTargetError("Invalid year", "INVALID_YEAR", 400)
  }
}

function assertMonth(month: number): void {
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new SalesTargetError("Invalid month", "INVALID_MONTH", 400)
  }
}

export function parseWeekPattern(raw: unknown): number[] {
  const fallback = [...DEFAULT_WEEK_PATTERN]
  if (raw == null) return fallback
  if (!Array.isArray(raw) || raw.length !== 7) return fallback
  const nums = raw.map((x) => {
    const n = Number(x)
    return Number.isFinite(n) && n >= 0 ? n : 0
  })
  if (nums.reduce((a, b) => a + b, 0) <= 0) return fallback
  return nums
}

export function parseMonthlyTotal(raw: unknown): string {
  if (raw === null || raw === undefined) {
    throw new SalesTargetError(
      "monthlyTotal is required",
      "INVALID_MONTHLY_TOTAL",
      400
    )
  }
  const normalized =
    typeof raw === "string" ? raw.replace(/,/g, "").trim() : String(raw)
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) {
    throw new SalesTargetError(
      "monthlyTotal must be a non-negative number",
      "INVALID_MONTHLY_TOTAL",
      400
    )
  }
  return toDec(n).toFixed(2)
}

/** Split monthly target into daily amounts using Mon–Sun weekday weights. */
export function splitMonthlyTargetToDaily(input: {
  monthlyTotal: string | number
  weekPattern: number[]
  year: number
  month: number
}): DailyTargetSplit[] {
  const year = input.year
  const month = input.month
  assertYear(year)
  assertMonth(month)

  const monthlyDec = toDec(input.monthlyTotal)
  const weights = parseWeekPattern(input.weekPattern)
  const dayKeys = monthDayKeys(year, month)
  const dim = daysInCalendarMonth(year, month)

  const weekdayIdx: number[] = []
  let weightSumMonth = ZERO
  for (let d = 1; d <= dim; d++) {
    const wd = bangkokWeekdayMon0(year, month, d)
    weekdayIdx.push(wd)
    weightSumMonth = weightSumMonth.plus(toDec(weights[wd] ?? 0))
  }

  const rawDaily =
    monthlyDec.gt(ZERO) && weightSumMonth.gt(ZERO)
      ? dayKeys.map((_, i) =>
          monthlyDec.times(toDec(weights[weekdayIdx[i]!] ?? 0).div(weightSumMonth))
        )
      : dayKeys.map(() => ZERO)

  const dailyRounded = rawDaily.map((x) =>
    toDec(Math.round(x.toNumber() * 100) / 100)
  )

  let sumRounded = ZERO
  for (const v of dailyRounded) {
    sumRounded = sumRounded.plus(v)
  }
  const drift = monthlyDec.minus(sumRounded)
  if (dailyRounded.length > 0 && drift.abs().gte(toDec("0.005"))) {
    const lastIdx = dailyRounded.length - 1
    dailyRounded[lastIdx] = dailyRounded[lastIdx]!.plus(drift)
  }

  return dayKeys.map((dateKey, i) => {
    const [, , dayStr] = dateKey.split("-")
    const day = Number(dayStr)
    return {
      dateKey,
      weekday: bangkokWeekdayLabel(year, month, day),
      target: dailyRounded[i]!.toFixed(2),
    }
  })
}

export async function listActiveShopBranches(
  db: Pick<PrismaClient, "branch">
): Promise<SalesTargetBranchOption[]> {
  const rows = await db.branch.findMany({
    where: {
      type: BranchType.SH,
      isActive: true,
      deleted: false,
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  })
  return rows
}

async function assertShopBranch(
  db: Pick<PrismaClient, "branch">,
  branchId: string
): Promise<void> {
  const branch = await db.branch.findFirst({
    where: {
      id: branchId,
      type: BranchType.SH,
      isActive: true,
      deleted: false,
    },
    select: { id: true },
  })
  if (!branch) {
    throw new SalesTargetError("Shop branch not found", "BRANCH_NOT_FOUND", 404)
  }
}

export async function getBranchSalesTarget(
  db: SalesTargetDb,
  input: { branchId: string; year: number; month: number }
): Promise<BranchSalesTargetView> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new SalesTargetError("branchId is required", "MISSING_BRANCH", 400)
  }
  const year = input.year
  const month = input.month
  assertYear(year)
  assertMonth(month)

  await assertShopBranch(db, branchId)

  const row = await db.branchSalesTarget.findUnique({
    where: { branchId_year_month: { branchId, year, month } },
  })

  if (!row) {
    return {
      branchId,
      year,
      month,
      monthlyTotal: "0.00",
      weekPattern: [...DEFAULT_WEEK_PATTERN],
      exists: false,
    }
  }

  return {
    id: row.id,
    branchId: row.branchId,
    year: row.year,
    month: row.month,
    monthlyTotal: toDec(row.monthlyTotal).toFixed(2),
    weekPattern: parseWeekPattern(row.weekPattern),
    exists: true,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function upsertBranchSalesTarget(
  db: SalesTargetDb,
  input: {
    branchId: string
    year: number
    month: number
    monthlyTotal: unknown
    weekPattern: unknown
  }
): Promise<BranchSalesTargetView> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new SalesTargetError("branchId is required", "MISSING_BRANCH", 400)
  }
  const year = input.year
  const month = input.month
  assertYear(year)
  assertMonth(month)

  await assertShopBranch(db, branchId)

  const monthlyTotal = parseMonthlyTotal(input.monthlyTotal)
  const weekPattern = parseWeekPattern(input.weekPattern)

  const row = await db.branchSalesTarget.upsert({
    where: { branchId_year_month: { branchId, year, month } },
    create: {
      branchId,
      year,
      month,
      monthlyTotal,
      weekPattern,
    },
    update: {
      monthlyTotal,
      weekPattern,
    },
  })

  return {
    id: row.id,
    branchId: row.branchId,
    year: row.year,
    month: row.month,
    monthlyTotal: toDec(row.monthlyTotal).toFixed(2),
    weekPattern: parseWeekPattern(row.weekPattern),
    exists: true,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function previewDailyTargets(input: {
  monthlyTotal: unknown
  weekPattern: unknown
  year: number
  month: number
}): { days: DailyTargetSplit[]; dailySum: string; monthlyTotal: string } {
  const year = input.year
  const month = input.month
  assertYear(year)
  assertMonth(month)

  const monthlyTotal = parseMonthlyTotal(input.monthlyTotal)
  const weekPattern = parseWeekPattern(input.weekPattern)
  const days = splitMonthlyTargetToDaily({ monthlyTotal, weekPattern, year, month })

  let dailySum = ZERO
  for (const day of days) {
    dailySum = dailySum.plus(toDec(day.target))
  }

  return {
    days,
    dailySum: dailySum.toFixed(2),
    monthlyTotal,
  }
}
