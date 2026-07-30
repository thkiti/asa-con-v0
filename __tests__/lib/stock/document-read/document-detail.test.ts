import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import { getStockDocumentDetail } from "@/lib/stock/document-read/document-detail"
import type { SessionUser } from "@/lib/auth/types"
import type { DocType } from "@/generated/prisma/client"

function session(partial: Partial<SessionUser> = {}): SessionUser {
  return {
    sessionId: "s1",
    userId: "u1",
    role: "HO_OPERATIONS",
    staffId: "staff-1",
    name: "HO",
    branchId: "branch-ho",
    branchCode: "HO999",
    branchName: "Head Office",
    documentEntityCode: "AS",
    ...partial,
  }
}

function mockPrisma(doc: Record<string, unknown> | null) {
  return {
    stockDocument: {
      findFirst: jest.fn().mockResolvedValue(doc),
    },
  }
}

function shopDoc(docType: DocType, id: string) {
  return {
    id,
    refNo: `REF-${id}`,
    docType,
    status: "DRAFT",
    date: new Date("2026-01-15T00:00:00.000Z"),
    periodMonth: "2026-01",
    branchId: "branch-shop",
    legalEntityCode: "AS",
    fromLocId: "branch-shop",
    toLocId: null,
    submittedAt: null,
    confirmedAt: null,
    postedAt: null,
    createdByStaffId: "staff-1",
    confirmedByStaffId: null,
    postedByStaffId: null,
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    createdAt: new Date("2026-01-15T00:00:00.000Z"),
    lines: [],
  }
}

describe("getStockDocumentDetail", () => {
  it.each([
    ["CNT", "ADJUSTMENT" as const, "cnt-1"],
    ["ORD", "TRANSFER_OUT" as const, "ord-1"],
    ["ADJ", "ADJUSTMENT" as const, "adj-1"],
    ["PER", "PERFORMANCE" as const, "per-1"],
    ["END", "END" as const, "end-1"],
  ])(
    "loads ASAS %s with session entity scope (not id alone / not HO999 branch gate)",
    async (_kind, docType, id) => {
      const prisma = mockPrisma(shopDoc(docType, id))
      const result = await getStockDocumentDetail(
        prisma as never,
        session({ documentEntityCode: "AS" }),
        id
      )

      expect(prisma.stockDocument.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id, legalEntityCode: "AS" },
        })
      )
      expect(result.id).toBe(id)
      expect(result.legalEntityCode).toBe("AS")
      expect(result.docType).toBe(docType)
    }
  )

  it("returns not found when id exists only under the other entity", async () => {
    const prisma = mockPrisma(null)
    await expect(
      getStockDocumentDetail(
        prisma as never,
        session({ documentEntityCode: "AS" }),
        "ad-doc"
      )
    ).rejects.toMatchObject({ code: DocumentErrorCodes.DOCUMENT_NOT_FOUND })

    expect(prisma.stockDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ad-doc", legalEntityCode: "AS" },
      })
    )
  })

  it("scopes ASAD detail to session AD entity", async () => {
    const prisma = mockPrisma({
      ...shopDoc("ADJUSTMENT", "ad-cnt"),
      branchId: "branch-ho",
      fromLocId: "branch-ho",
      legalEntityCode: "AD",
    })

    const result = await getStockDocumentDetail(
      prisma as never,
      session({ documentEntityCode: "AD" }),
      "ad-cnt"
    )

    expect(prisma.stockDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ad-cnt", legalEntityCode: "AD" },
      })
    )
    expect(result.legalEntityCode).toBe("AD")
  })
})
