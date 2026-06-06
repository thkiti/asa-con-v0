import type { PrismaClient } from "@/generated/prisma/client"
import {
  bangkokCalendarParts,
  bangkokDateKey,
  bangkokTimeLabelSeconds,
  monthDayKeys,
} from "@/lib/reporting/bangkok-calendar"
import { formatWorkedDuration } from "@/lib/pos/format-worked-duration"
import type { PosWorktimeView } from "@/lib/pos/worktime-types"
import { formatPosTargetVsSalesMonthLabel } from "@/lib/pos/target-vs-sales"

type WorktimeDb = Pick<PrismaClient, "workTimeEntry" | "branch">

type WorktimeEntryRow = {
  workDate: string
  clockInAt: Date | null
  clockOutAt: Date | null
}

function formatClockTime(value: Date | null | undefined): string | null {
  if (!value) return null
  return bangkokTimeLabelSeconds(value)
}

function secondsBetween(clockIn: Date, clockOut: Date): number {
  const ms = clockOut.getTime() - clockIn.getTime()
  if (ms <= 0) return 0
  return Math.floor(ms / 1000)
}

function computeMonthMetrics(entries: WorktimeEntryRow[]): {
  workDays: number
  totalSeconds: number
  incompleteDays: number
} {
  let workDays = 0
  let totalSeconds = 0
  let incompleteDays = 0

  for (const row of entries) {
    const hasIn = row.clockInAt != null
    const hasOut = row.clockOutAt != null

    if (hasIn) workDays += 1

    if (hasIn !== hasOut) {
      incompleteDays += 1
    }

    if (hasIn && hasOut) {
      totalSeconds += secondsBetween(row.clockInAt!, row.clockOutAt!)
    }
  }

  return { workDays, totalSeconds, incompleteDays }
}

async function loadMonthEntries(
  db: WorktimeDb,
  input: { branchId: string; staffId: string; year: number; month: number }
): Promise<Map<string, WorktimeEntryRow>> {
  const dayKeys = monthDayKeys(input.year, input.month)
  const rows = await db.workTimeEntry.findMany({
    where: {
      branchId: input.branchId,
      staffId: input.staffId,
      workDate: { in: dayKeys },
    },
    select: {
      workDate: true,
      clockInAt: true,
      clockOutAt: true,
    },
  })

  return new Map(rows.map((row) => [row.workDate, row]))
}

export async function buildPosWorktimeView(
  db: WorktimeDb,
  input: { branchId: string; staffId: string; now?: Date }
): Promise<PosWorktimeView> {
  const branchId = String(input.branchId ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()
  if (!branchId || !staffId) {
    throw new Error("branchId and staffId are required")
  }

  const now = input.now ?? new Date()
  const { y: year, m: month } = bangkokCalendarParts(now)
  const todayDateKey = bangkokDateKey(now)

  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  })

  const entryByDate = await loadMonthEntries(db, { branchId, staffId, year, month })
  const dayKeys = monthDayKeys(year, month)

  const entryRows = dayKeys
    .map((dateKey) => entryByDate.get(dateKey))
    .filter((row): row is WorktimeEntryRow => row != null)

  const metrics = computeMonthMetrics(entryRows)

  const days = dayKeys.map((dateKey) => {
    const row = entryByDate.get(dateKey)
    const dayNum = Number(dateKey.slice(8, 10))
    return {
      dateKey,
      day: dayNum,
      clockIn: formatClockTime(row?.clockInAt),
      clockOut: formatClockTime(row?.clockOutAt),
      isToday: dateKey === todayDateKey,
    }
  })

  return {
    branchCode: branch?.code ?? "",
    monthLabel: formatPosTargetVsSalesMonthLabel(year, month),
    summary: {
      workDays: metrics.workDays,
      totalHours: formatWorkedDuration(metrics.totalSeconds),
      incompleteDays: metrics.incompleteDays,
    },
    days,
  }
}

async function upsertTodayEntry(
  db: WorktimeDb,
  input: {
    branchId: string
    staffId: string
    now: Date
    field: "clockInAt" | "clockOutAt"
  }
) {
  const workDate = bangkokDateKey(input.now)
  const existing = await db.workTimeEntry.findUnique({
    where: {
      branchId_staffId_workDate: {
        branchId: input.branchId,
        staffId: input.staffId,
        workDate,
      },
    },
  })

  if (existing?.[input.field]) {
    return existing
  }

  if (existing) {
    return db.workTimeEntry.update({
      where: { id: existing.id },
      data: { [input.field]: input.now },
    })
  }

  return db.workTimeEntry.create({
    data: {
      branchId: input.branchId,
      staffId: input.staffId,
      workDate,
      [input.field]: input.now,
    },
  })
}

export async function recordPosWorktimeClockIn(
  db: WorktimeDb,
  input: { branchId: string; staffId: string; now?: Date }
): Promise<PosWorktimeView> {
  const now = input.now ?? new Date()
  await upsertTodayEntry(db, {
    branchId: input.branchId,
    staffId: input.staffId,
    now,
    field: "clockInAt",
  })
  return buildPosWorktimeView(db, { ...input, now })
}

export async function recordPosWorktimeClockOut(
  db: WorktimeDb,
  input: { branchId: string; staffId: string; now?: Date }
): Promise<PosWorktimeView> {
  const now = input.now ?? new Date()
  await upsertTodayEntry(db, {
    branchId: input.branchId,
    staffId: input.staffId,
    now,
    field: "clockOutAt",
  })
  return buildPosWorktimeView(db, { ...input, now })
}

/** @internal test helper */
export function computePosWorktimeMonthMetrics(entries: WorktimeEntryRow[]) {
  const metrics = computeMonthMetrics(entries)
  return {
    ...metrics,
    totalHours: formatWorkedDuration(metrics.totalSeconds),
  }
}
