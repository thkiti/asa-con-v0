import {
  isPosShopBranchCode,
  requirePosShopSession,
} from "@/lib/pos/pos-shop-session"
import { PosLookupError } from "@/lib/pos/pos-errors"

const shopSession = {
  sessionId: "s1",
  userId: "u1",
  role: "SH_STAFF" as const,
  staffId: "staff-1",
  name: "Shop",
  branchId: "branch-shop",
  branchCode: "SH001",
  branchName: "Shop Branch",
}

const hoSession = {
  ...shopSession,
  role: "HO_ADMIN" as const,
  branchId: "branch-ho",
  branchCode: "HO999",
  branchName: "Head Office",
}

describe("isPosShopBranchCode", () => {
  it("accepts shop branch codes", () => {
    expect(isPosShopBranchCode("SH001")).toBe(true)
    expect(isPosShopBranchCode(" sh999 ")).toBe(true)
  })

  it("rejects HO branch codes", () => {
    expect(isPosShopBranchCode("HO999")).toBe(false)
  })
})

describe("requirePosShopSession", () => {
  it("returns session for shop branch", () => {
    expect(requirePosShopSession(shopSession)).toEqual(shopSession)
  })

  it("rejects HO branch session", () => {
    expect(() => requirePosShopSession(hoSession)).toThrow(PosLookupError)
    try {
      requirePosShopSession(hoSession)
    } catch (err) {
      expect(err).toMatchObject({
        code: "POS_SHOP_BRANCH_REQUIRED",
        httpStatus: 403,
      })
    }
  })

  it("rejects missing session", () => {
    expect(() => requirePosShopSession(null)).toThrow()
  })
})
