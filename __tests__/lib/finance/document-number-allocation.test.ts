import { Prisma as PrismaNamespace } from "@/generated/prisma/client"
import {
  buildFinanceDocumentNumber,
  createWithAllocatedEntryNoRetry,
  formatDocumentYearSuffix,
  isPrismaUniqueConstraintError,
  maxSequenceFromDocumentNumbers,
  parseSequenceFromDocumentNumber,
} from "@/lib/finance/document-number-allocation"

describe("document-number-allocation", () => {
  const documentDate = new Date("2026-06-14T12:00:00.000Z")

  it("builds CODE-YYnnnn without embedding legal entity", () => {
    expect(buildFinanceDocumentNumber("PAV", documentDate, 1)).toBe("PAV-260001")
    expect(buildFinanceDocumentNumber("PAV", documentDate, 42)).toBe("PAV-260042")
    expect(buildFinanceDocumentNumber("PAV", documentDate, 1)).not.toMatch(/AS|AD/)
  })

  it("uses Bangkok calendar year for YY suffix", () => {
    const lateDec = new Date("2025-12-31T20:00:00.000Z")
    expect(formatDocumentYearSuffix(lateDec)).toBe("26")
    expect(buildFinanceDocumentNumber("MJV", lateDec, 1)).toBe("MJV-260001")
  })

  it("parses sequence suffix and finds max across gaps", () => {
    const prefix = "PAV-26"
    const numbers = ["PAV-260001", "PAV-260003", "PAV-26oops", "OTHER-260002"]
    expect(parseSequenceFromDocumentNumber("PAV-260002", prefix)).toBe(2)
    expect(maxSequenceFromDocumentNumbers(numbers, prefix)).toBe(3)
  })

  it("detects prisma unique constraint errors", () => {
    const err = new PrismaNamespace.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    })
    expect(isPrismaUniqueConstraintError(err)).toBe(true)
    expect(isPrismaUniqueConstraintError(new Error("other"))).toBe(false)
  })

  it("retries allocation when composite unique races", async () => {
    const p2002 = new PrismaNamespace.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    })

    let allocateCalls = 0
    const created = await createWithAllocatedEntryNoRetry({
      allocate: async () => {
        allocateCalls += 1
        return allocateCalls === 1 ? "REV-260001" : "REV-260002"
      },
      create: async (entryNo) => {
        if (entryNo === "REV-260001") throw p2002
        return entryNo
      },
      allocationFailedError: () => new Error("allocation failed"),
    })

    expect(created).toBe("REV-260002")
    expect(allocateCalls).toBe(2)
  })
})
