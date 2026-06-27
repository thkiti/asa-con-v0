import { resolveCollectorDefaultDates } from "@/lib/pos/collector-default-dates"

function makeDb(reportJson: unknown | null) {
  return {
    collectorReport: {
      findFirst: jest.fn().mockResolvedValue(
        reportJson
          ? {
              reportJson,
            }
          : null
      ),
    },
  }
}

describe("resolveCollectorDefaultDates", () => {
  it("defaults from and to to today when no prior collector report exists", async () => {
    const db = makeDb(null)
    const at = new Date("2026-06-25T10:00:00.000Z")

    const dates = await resolveCollectorDefaultDates(db as never, "branch-1", at)

    expect(dates).toEqual({ dateFrom: "2026-06-25", dateTo: "2026-06-25" })
  })

  it("defaults from date to day after latest collected end date", async () => {
    const db = makeDb({
      mode: "COLLECT",
      bangkokDateFrom: "2026-06-05",
      bangkokDateTo: "2026-06-09",
    })
    const at = new Date("2026-06-25T10:00:00.000Z")

    const dates = await resolveCollectorDefaultDates(db as never, "branch-1", at)

    expect(dates).toEqual({ dateFrom: "2026-06-10", dateTo: "2026-06-25" })
  })
})
