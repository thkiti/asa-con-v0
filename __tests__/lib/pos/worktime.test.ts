import {
  buildPosWorktimeView,
  computePosWorktimeMonthMetrics,
  recordPosWorktimeClockIn,
  recordPosWorktimeClockOut,
} from "@/lib/pos/worktime"

type Entry = {
  id: string
  branchId: string
  staffId: string
  workDate: string
  clockInAt: Date | null
  clockOutAt: Date | null
}

function createMockDb(initial: Entry[] = []) {
  const entries = [...initial]

  return {
    state: entries,
    db: {
      branch: {
        findUnique: async () => ({ code: "SH001" }),
      },
      workTimeEntry: {
        findMany: async ({
          where,
        }: {
          where: {
            branchId: string
            staffId: string
            workDate: { in: string[] }
          }
        }) => {
          return entries.filter(
            (row) =>
              row.branchId === where.branchId &&
              row.staffId === where.staffId &&
              where.workDate.in.includes(row.workDate)
          )
        },
        findUnique: async ({
          where,
        }: {
          where: {
            branchId_staffId_workDate: {
              branchId: string
              staffId: string
              workDate: string
            }
          }
        }) => {
          const key = where.branchId_staffId_workDate
          return (
            entries.find(
              (row) =>
                row.branchId === key.branchId &&
                row.staffId === key.staffId &&
                row.workDate === key.workDate
            ) ?? null
          )
        },
        create: async ({ data }: { data: Omit<Entry, "id"> }) => {
          const row: Entry = { id: `e-${entries.length + 1}`, ...data }
          entries.push(row)
          return row
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string }
          data: Partial<Pick<Entry, "clockInAt" | "clockOutAt">>
        }) => {
          const row = entries.find((e) => e.id === where.id)
          if (!row) throw new Error("not found")
          Object.assign(row, data)
          return row
        },
      },
    },
  }
}

const branchId = "b1"
const staffId = "103"
const june6Morning = new Date("2026-06-06T09:15:00+07:00")
const june6Evening = new Date("2026-06-06T18:05:44+07:00")

describe("computePosWorktimeMonthMetrics", () => {
  it("counts work days by clock-in and sums completed pair hours", () => {
    const metrics = computePosWorktimeMonthMetrics([
      {
        workDate: "2026-06-05",
        clockInAt: new Date("2026-06-05T09:00:00+07:00"),
        clockOutAt: new Date("2026-06-05T17:00:00+07:00"),
      },
      {
        workDate: "2026-06-06",
        clockInAt: june6Morning,
        clockOutAt: june6Evening,
      },
      {
        workDate: "2026-06-07",
        clockInAt: new Date("2026-06-07T09:00:00+07:00"),
        clockOutAt: null,
      },
      {
        workDate: "2026-06-08",
        clockInAt: null,
        clockOutAt: new Date("2026-06-08T18:00:00+07:00"),
      },
    ])

    expect(metrics.workDays).toBe(3)
    expect(metrics.incompleteDays).toBe(2)
    expect(metrics.totalHours).toBe("16:50:44")
    expect(metrics.totalSeconds).toBe(60644)
  })
})

describe("buildPosWorktimeView", () => {
  it("returns calendar with IN/OUT times and dashes for missing values", async () => {
    const { db } = createMockDb([
      {
        id: "e1",
        branchId,
        staffId,
        workDate: "2026-06-06",
        clockInAt: june6Morning,
        clockOutAt: null,
      },
    ])

    const view = await buildPosWorktimeView(db as never, {
      branchId,
      staffId,
      now: june6Morning,
    })

    const today = view.days.find((d) => d.dateKey === "2026-06-06")
    expect(today?.clockIn).toBe("09:15:00")
    expect(today?.clockOut).toBeNull()
    expect(view.summary.workDays).toBe(1)
    expect(view.summary.incompleteDays).toBe(1)
  })
})

describe("recordPosWorktimeClockIn/Out", () => {
  it("records IN and OUT for today without overwriting existing stamps", async () => {
    const mock = createMockDb()

    await recordPosWorktimeClockIn(mock.db as never, {
      branchId,
      staffId,
      now: june6Morning,
    })
    await recordPosWorktimeClockOut(mock.db as never, {
      branchId,
      staffId,
      now: june6Evening,
    })

    const secondIn = await recordPosWorktimeClockIn(mock.db as never, {
      branchId,
      staffId,
      now: new Date("2026-06-06T10:00:00+07:00"),
    })

    const today = secondIn.days.find((d) => d.dateKey === "2026-06-06")
    expect(today?.clockIn).toBe("09:15:00")
    expect(today?.clockOut).toBe("18:05:44")
  })

  it("allows OUT without prior IN", async () => {
    const mock = createMockDb()

    const view = await recordPosWorktimeClockOut(mock.db as never, {
      branchId,
      staffId,
      now: june6Evening,
    })

    const today = view.days.find((d) => d.dateKey === "2026-06-06")
    expect(today?.clockIn).toBeNull()
    expect(today?.clockOut).toBe("18:05:44")
    expect(view.summary.incompleteDays).toBe(1)
  })
})
