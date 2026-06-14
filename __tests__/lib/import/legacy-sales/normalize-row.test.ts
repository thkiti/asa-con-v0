import {
  combineLegacySaleDateTime,
  isOnOrAfterCutoff,
  normalizeLegacySalesDbfRecord,
  parseLegacySaleDate,
  parseLegacySaleTime,
} from "@/lib/import/legacy-sales/normalize-row"

describe("legacy sales row normalization", () => {
  it("parses DD/MM/YYYY legacy dates", () => {
    expect(parseLegacySaleDate("01/01/2026")).toEqual({
      dateKey: "2026-01-01",
      year: 2026,
      month: 1,
      day: 1,
    })
  })

  it("combines legacy date and time", () => {
    const value = combineLegacySaleDateTime("15/03/2026", "10:57:03")
    expect(value).toEqual(new Date(2026, 2, 15, 10, 57, 3, 0))
  })

  it("accepts blank time as midnight", () => {
    expect(parseLegacySaleTime("")).toEqual({ hours: 0, minutes: 0, seconds: 0 })
  })

  it("normalizes product code from I_ID", () => {
    const result = normalizeLegacySalesDbfRecord(
      {
        S_TRANS: "000125810",
        S_DATE: "02/01/2026",
        S_TIME: "10:57:03",
        S_ID: "006",
        E_ID: "011",
        I_ID: "0104001",
        S_QTY: 1,
        S_AMOUNT: 95,
      },
      1
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.row.legacyProductCode).toBe("0104001")
      expect(result.row.legacyTransNo).toBe("000125810")
      expect(result.row.legacyBranchId).toBe("006")
    }
  })
})

describe("legacy sales cutoff filter", () => {
  it("rejects rows before 2026-01-01", () => {
    const result = normalizeLegacySalesDbfRecord(
      {
        S_TRANS: "1",
        S_DATE: "31/12/2025",
        S_TIME: "12:00:00",
        S_ID: "001",
        E_ID: "1",
        I_ID: "0104001",
        S_QTY: 1,
        S_AMOUNT: 10,
      },
      1
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe("OLD_DATA")
    }
  })

  it("accepts rows on cutoff date", () => {
    expect(isOnOrAfterCutoff("2026-01-01")).toBe(true)
    const result = normalizeLegacySalesDbfRecord(
      {
        S_TRANS: "1",
        S_DATE: "01/01/2026",
        S_TIME: "12:00:00",
        S_ID: "001",
        E_ID: "1",
        I_ID: "0104001",
        S_QTY: 1,
        S_AMOUNT: 10,
      },
      1
    )
    expect(result.ok).toBe(true)
  })
})
