/**
 * @jest-environment node
 */
import {
  resolveEndGetOrCreateBranch,
  resolveStockDocumentListScope,
} from "@/lib/stock/document-read/resolve-stock-document-list-scope"
import { DocumentError } from "@/lib/stock/document/document-errors"
import type { SessionUser } from "@/lib/auth/types"

const ho = { id: "ho-id", code: "HO999", type: "HO", deleted: false, isActive: true }
const shop = {
  id: "sh-id",
  code: "SH001",
  type: "SH",
  deleted: false,
  isActive: true,
}

function makeDb(branches: Record<string, typeof ho | typeof shop>) {
  return {
    branch: {
      findFirst: jest.fn(async ({ where }: { where: { OR?: unknown } }) => {
        if (where?.OR) return ho
        return null
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        return branches[where.id] ?? null
      }),
    },
  }
}

function session(partial: Partial<SessionUser>): SessionUser {
  return {
    sessionId: "s1",
    staffId: "staff-1",
    name: "Test",
    role: "HO_ADMIN",
    branchId: ho.id,
    branchCode: "HO999",
    branchName: "Head Office",
    documentEntityCode: "AS",
    ...partial,
  }
}

describe("resolveStockDocumentListScope", () => {
  it("ASAD always resolves HO999 and rejects shop branch", async () => {
    const db = makeDb({ [ho.id]: ho, [shop.id]: shop })
    await expect(
      resolveStockDocumentListScope(db as never, session({ documentEntityCode: "AD" }), {
        branchId: shop.id,
      })
    ).rejects.toThrow(/HO999/)

    const ok = await resolveStockDocumentListScope(
      db as never,
      session({ documentEntityCode: "AD" }),
      { branchId: null }
    )
    expect(ok.branchId).toBe(ho.id)
    expect(ok.legalEntityCode).toBe("AD")
  })

  it("ASAS All Shops does not fall back to HO999", async () => {
    const db = makeDb({ [ho.id]: ho, [shop.id]: shop })
    const scope = await resolveStockDocumentListScope(
      db as never,
      session({ documentEntityCode: "AS", role: "HO_ADMIN" }),
      { branchId: null }
    )
    expect(scope.branchId).toBeNull()
    expect(scope.legalEntityCode).toBe("AS")
  })

  it("ASAS rejects HO999 branch filter", async () => {
    const db = makeDb({ [ho.id]: ho, [shop.id]: shop })
    await expect(
      resolveStockDocumentListScope(
        db as never,
        session({ documentEntityCode: "AS", role: "HO_ADMIN" }),
        { branchId: ho.id }
      )
    ).rejects.toThrow(/HO999/)
  })
})

describe("resolveEndGetOrCreateBranch", () => {
  it("ASAD END create/get always resolves HO999", async () => {
    const db = makeDb({ [ho.id]: ho, [shop.id]: shop })
    const resolved = await resolveEndGetOrCreateBranch(
      db as never,
      session({ documentEntityCode: "AD" }),
      { branchId: null }
    )
    expect(resolved).toEqual({ legalEntityCode: "AD", branchId: ho.id })
  })

  it("rejects ASAD END for SHxxx without remapping", async () => {
    const db = makeDb({ [ho.id]: ho, [shop.id]: shop })
    await expect(
      resolveEndGetOrCreateBranch(
        db as never,
        session({ documentEntityCode: "AD" }),
        { branchId: shop.id }
      )
    ).rejects.toThrow(DocumentError)
  })

  it("ASAS END requires one specific SHxxx Shop", async () => {
    const db = makeDb({ [ho.id]: ho, [shop.id]: shop })
    await expect(
      resolveEndGetOrCreateBranch(
        db as never,
        session({ documentEntityCode: "AS" }),
        { branchId: null }
      )
    ).rejects.toThrow(/specific Shop/)

    const ok = await resolveEndGetOrCreateBranch(
      db as never,
      session({ documentEntityCode: "AS" }),
      { branchId: shop.id }
    )
    expect(ok).toEqual({ legalEntityCode: "AS", branchId: shop.id })
  })
})
