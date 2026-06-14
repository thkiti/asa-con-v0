import { Prisma } from "@/generated/prisma/client"
import {
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import {
  assertDraftEditable,
  assertManualJournalLineSides,
  resolveManualJournalEntryLines,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-validation"

describe("manual-journal-entry-validation", () => {
  const accounts = [
    {
      id: "acc-active",
      code: "1100",
      isActive: true,
      deleted: false,
    },
    {
      id: "acc-inactive",
      code: "1200",
      isActive: false,
      deleted: false,
    },
    {
      id: "acc-deleted",
      code: "1300",
      isActive: true,
      deleted: true,
    },
  ]

  const tx = {
    glAccount: {
      findMany: jest.fn(async () => accounts),
    },
  }

  describe("assertManualJournalLineSides", () => {
    it("accepts debit-only line", () => {
      expect(() =>
        assertManualJournalLineSides(new Prisma.Decimal(100), new Prisma.Decimal(0))
      ).not.toThrow()
    })

    it("accepts credit-only line", () => {
      expect(() =>
        assertManualJournalLineSides(new Prisma.Decimal(0), new Prisma.Decimal(50))
      ).not.toThrow()
    })

    it("rejects both debit and credit", () => {
      expect(() =>
        assertManualJournalLineSides(new Prisma.Decimal(10), new Prisma.Decimal(10))
      ).toThrow(expect.objectContaining({ code: ManualJournalEntryErrorCodes.INVALID_LINE }))
    })

    it("rejects neither debit nor credit", () => {
      expect(() =>
        assertManualJournalLineSides(new Prisma.Decimal(0), new Prisma.Decimal(0))
      ).toThrow(expect.objectContaining({ code: ManualJournalEntryErrorCodes.INVALID_LINE }))
    })

    it("rejects negative debit", () => {
      expect(() =>
        assertManualJournalLineSides(new Prisma.Decimal(-1), new Prisma.Decimal(0))
      ).toThrow(expect.objectContaining({ code: ManualJournalEntryErrorCodes.INVALID_LINE }))
    })

    it("rejects negative credit", () => {
      expect(() =>
        assertManualJournalLineSides(new Prisma.Decimal(0), new Prisma.Decimal(-1))
      ).toThrow(expect.objectContaining({ code: ManualJournalEntryErrorCodes.INVALID_LINE }))
    })
  })

  describe("assertDraftEditable", () => {
    it("allows DRAFT", () => {
      expect(() => assertDraftEditable("DRAFT")).not.toThrow()
    })

    it("rejects SUBMITTED and CONFIRMED with NOT_DRAFT", () => {
      expect(() => assertDraftEditable("SUBMITTED")).toThrow(
        expect.objectContaining({ code: ManualJournalEntryErrorCodes.NOT_DRAFT })
      )
      expect(() => assertDraftEditable("CONFIRMED")).toThrow(
        expect.objectContaining({ code: ManualJournalEntryErrorCodes.NOT_DRAFT })
      )
    })

    it("rejects POSTED and CANCELLED with IMMUTABLE_ENTRY", () => {
      expect(() => assertDraftEditable("POSTED")).toThrow(
        expect.objectContaining({ code: ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY })
      )
      expect(() => assertDraftEditable("CANCELLED")).toThrow(
        expect.objectContaining({ code: ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY })
      )
    })
  })

  describe("resolveManualJournalEntryLines", () => {
    it("resolves accountCode to glAccountId", async () => {
      const lines = await resolveManualJournalEntryLines(tx as never, [
        { accountCode: "1100", debit: "100", credit: "0" },
      ])

      expect(lines).toEqual([
        expect.objectContaining({
          lineNo: 1,
          glAccountId: "acc-active",
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
        }),
      ])
    })

    it("accepts glAccountId directly", async () => {
      const lines = await resolveManualJournalEntryLines(tx as never, [
        { glAccountId: "acc-active", debit: 50, credit: 0 },
      ])

      expect(lines[0].glAccountId).toBe("acc-active")
    })

    it("rejects inactive account", async () => {
      await expect(
        resolveManualJournalEntryLines(tx as never, [
          { accountCode: "1200", debit: 10, credit: 0 },
        ])
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.ACCOUNT_INACTIVE,
      })
    })

    it("rejects deleted account", async () => {
      await expect(
        resolveManualJournalEntryLines(tx as never, [
          { accountCode: "1300", debit: 10, credit: 0 },
        ])
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.ACCOUNT_NOT_FOUND,
      })
    })

    it("rejects unknown account code", async () => {
      await expect(
        resolveManualJournalEntryLines(tx as never, [
          { accountCode: "9999", debit: 10, credit: 0 },
        ])
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.ACCOUNT_NOT_FOUND,
      })
    })
  })
})
