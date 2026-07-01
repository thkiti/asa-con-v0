import { Prisma } from "@/generated/prisma/client"
import { isPrismaTableMissingError } from "@/lib/document-archive/prisma-errors"

describe("isPrismaTableMissingError", () => {
  it("detects Prisma P2021 table missing", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Table does not exist", {
      code: "P2021",
      clientVersion: "test",
    })
    expect(isPrismaTableMissingError(error)).toBe(true)
  })

  it("detects generic table missing message", () => {
    expect(
      isPrismaTableMissingError(
        new Error('The table `public.DocumentArchiveLink` does not exist in the current database.')
      )
    ).toBe(true)
  })

  it("returns false for unrelated errors", () => {
    expect(isPrismaTableMissingError(new Error("connection refused"))).toBe(false)
  })
})

describe("loadVaultArchivesForRefs", () => {
  it("returns empty map when DocumentArchiveLink table is missing", async () => {
    const { loadVaultArchivesForRefs } = await import("@/lib/document-archive/vault-lookup")

    const prisma = {
      documentArchiveLink: {
        findMany: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError(
            'The table `public.DocumentArchiveLink` does not exist in the current database.',
            { code: "P2021", clientVersion: "test" }
          )
        ),
      },
    }

    const result = await loadVaultArchivesForRefs(prisma as never, [
      {
        documentKind: "COL",
        documentId: "collector-report-1",
        archiveKind: "BANK_PAY_IN_SLIP",
      },
    ])

    expect(result).toEqual(new Map())
    expect(prisma.documentArchiveLink.findMany).toHaveBeenCalled()
  })
})
