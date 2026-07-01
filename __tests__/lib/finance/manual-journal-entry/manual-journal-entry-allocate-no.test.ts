import type { ManualJournalEntryType } from "@/generated/prisma/client"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import {
  ENTRY_TYPE_DOCUMENT_CODE,
  allocateManualJournalEntryNo,
  buildManualJournalEntryNo,
  calendarYearFromEntryDate,
  countManualJournalEntriesInScope,
  documentCodeForEntryType,
  findMaxManualJournalEntrySequenceInScope,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-allocate-no"

describe("manual-journal-entry-allocate-no", () => {
  const entryDate = new Date("2026-06-14T12:00:00.000Z")

  describe("document code mapping", () => {
    it("maps all ManualJournalEntryType values to handbook codes", () => {
      expect(ENTRY_TYPE_DOCUMENT_CODE).toEqual({
        MANUAL: "MJV",
        OPENING_BALANCE: "OPB",
        ADJUSTMENT: "ADJ",
        RECLASS: "REJ",
        ACCRUAL: "ACJ",
        AUDITOR_ADJUSTMENT: "AUJ",
      })
    })

    it.each<[ManualJournalEntryType, string]>([
      ["MANUAL", "MJV"],
      ["OPENING_BALANCE", "OPB"],
      ["ADJUSTMENT", "ADJ"],
      ["RECLASS", "REJ"],
      ["ACCRUAL", "ACJ"],
      ["AUDITOR_ADJUSTMENT", "AUJ"],
    ])("documentCodeForEntryType(%s) -> %s", (entryType, code) => {
      expect(documentCodeForEntryType(entryType)).toBe(code)
    })
  })

  describe("buildManualJournalEntryNo format", () => {
    it.each<[ManualJournalEntryType, string]>([
      ["MANUAL", "MJV-260001"],
      ["OPENING_BALANCE", "OPB-260001"],
      ["ADJUSTMENT", "ADJ-260001"],
      ["RECLASS", "REJ-260001"],
      ["ACCRUAL", "ACJ-260001"],
      ["AUDITOR_ADJUSTMENT", "AUJ-260001"],
    ])("formats %s as %s", (entryType, expected) => {
      expect(buildManualJournalEntryNo(entryType, entryDate, 1)).toBe(expected)
    })

    it("does not embed legal entity in entryNo", () => {
      const no = buildManualJournalEntryNo("MANUAL", entryDate, 42)
      expect(no).toBe("MJV-260042")
      expect(no).not.toMatch(/ASAS|ASAD/)
    })

    it("uses Bangkok calendar year for YY", () => {
      const lateDec = new Date("2025-12-31T20:00:00.000Z")
      expect(calendarYearFromEntryDate(lateDec)).toBe(2026)
      expect(buildManualJournalEntryNo("MANUAL", lateDec, 1)).toBe("MJV-260001")
    })
  })

  describe("countManualJournalEntriesInScope", () => {
    it("scopes count by legalEntityCode, entryType, and calendar year", async () => {
      const count = jest.fn().mockResolvedValue(3)
      const tx = { manualJournalEntry: { count } }

      await countManualJournalEntriesInScope(
        tx as never,
        "AS",
        "MANUAL",
        entryDate
      )

      expect(count).toHaveBeenCalledWith({
        where: {
          legalEntityCode: "AS",
          entryType: "MANUAL",
          entryDate: {
            gte: new Date("2026-01-01T00:00:00+07:00"),
            lt: new Date("2027-01-01T00:00:00+07:00"),
          },
        },
      })
    })
  })

  describe("allocateManualJournalEntryNo", () => {
    type SeedEntry = {
      legalEntityCode: string
      entryType: ManualJournalEntryType
      entryDate: Date
      entryNo: string
    }

    function createTx(entries: SeedEntry[]) {
      return {
        manualJournalEntry: {
          findMany: jest.fn(async ({ where }: {
            where: {
              legalEntityCode: string
              entryType: ManualJournalEntryType
              entryDate: { gte: Date; lt: Date }
              entryNo?: { startsWith: string }
            }
          }) => {
            return entries
              .filter(
                (entry) =>
                  entry.legalEntityCode === where.legalEntityCode &&
                  entry.entryType === where.entryType &&
                  entry.entryDate >= where.entryDate.gte &&
                  entry.entryDate < where.entryDate.lt &&
                  (!where.entryNo?.startsWith ||
                    entry.entryNo.startsWith(where.entryNo.startsWith))
              )
              .map((entry) => ({ entryNo: entry.entryNo }))
          }),
        },
      }
    }

    it("returns next sequence within legalEntityCode + type + year", async () => {
      const tx = createTx([
        {
          legalEntityCode: "AS",
          entryType: "MANUAL",
          entryDate: entryDate,
          entryNo: "MJV-260001",
        },
      ])

      const no = await allocateManualJournalEntryNo(tx as never, {
        legalEntityCode: "AS",
        entryType: "MANUAL",
        entryDate,
      })

      expect(no).toBe("MJV-260002")
    })

    it("allows the same entryNo across different legalEntityCode scopes", async () => {
      const tx = createTx([
        {
          legalEntityCode: "AD",
          entryType: "MANUAL",
          entryDate: entryDate,
          entryNo: "MJV-260001",
        },
      ])

      const no = await allocateManualJournalEntryNo(tx as never, {
        legalEntityCode: "AS",
        entryType: "MANUAL",
        entryDate,
      })

      expect(no).toBe("MJV-260001")
    })

    it("isolates sequence per legalEntityCode", async () => {
      const tx = createTx([
        {
          legalEntityCode: "AS",
          entryType: "MANUAL",
          entryDate: entryDate,
          entryNo: "MJV-260001",
        },
        {
          legalEntityCode: "AD",
          entryType: "MANUAL",
          entryDate: entryDate,
          entryNo: "MJV-260001",
        },
      ])

      const asas = await allocateManualJournalEntryNo(tx as never, {
        legalEntityCode: "AS",
        entryType: "MANUAL",
        entryDate,
      })
      const asad = await allocateManualJournalEntryNo(tx as never, {
        legalEntityCode: "AD",
        entryType: "MANUAL",
        entryDate,
      })

      expect(asas).toBe("MJV-260002")
      expect(asad).toBe("MJV-260002")
    })

    it("advances past gaps in the same legal entity sequence", async () => {
      const tx = createTx([
        {
          legalEntityCode: "AS",
          entryType: "MANUAL",
          entryDate: entryDate,
          entryNo: "MJV-260001",
        },
        {
          legalEntityCode: "AS",
          entryType: "MANUAL",
          entryDate: entryDate,
          entryNo: "MJV-260003",
        },
      ])

      const no = await findMaxManualJournalEntrySequenceInScope(
        tx as never,
        "AS",
        "MANUAL",
        entryDate
      )

      expect(no).toBe(3)
      expect(
        await allocateManualJournalEntryNo(tx as never, {
          legalEntityCode: "AS",
          entryType: "MANUAL",
          entryDate,
        })
      ).toBe("MJV-260004")
    })

    it("isolates sequence per entryType", async () => {
      const tx = createTx([
        {
          legalEntityCode: "AS",
          entryType: "MANUAL",
          entryDate: entryDate,
          entryNo: "MJV-260001",
        },
      ])

      const mjv = await allocateManualJournalEntryNo(tx as never, {
        legalEntityCode: "AS",
        entryType: "MANUAL",
        entryDate,
      })
      const opb = await allocateManualJournalEntryNo(tx as never, {
        legalEntityCode: "AS",
        entryType: "OPENING_BALANCE",
        entryDate,
      })

      expect(mjv).toBe("MJV-260002")
      expect(opb).toBe("OPB-260001")
    })

    it("rejects empty legalEntityCode", async () => {
      const tx = createTx([])

      await expect(
        allocateManualJournalEntryNo(tx as never, {
          legalEntityCode: "  ",
          entryType: "MANUAL",
          entryDate,
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.DOCUMENT_NUMBER_ALLOCATION_FAILED,
      })
    })

    it("wraps unexpected errors as DOCUMENT_NUMBER_ALLOCATION_FAILED", async () => {
      const tx = {
        manualJournalEntry: {
          findMany: jest.fn().mockRejectedValue(new Error("db down")),
        },
      }

      await expect(
        allocateManualJournalEntryNo(tx as never, {
          legalEntityCode: "AS",
          entryType: "MANUAL",
          entryDate,
        })
      ).rejects.toBeInstanceOf(ManualJournalEntryError)
    })
  })
})
