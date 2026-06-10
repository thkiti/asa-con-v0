import { isLoginBranchAllowed } from "@/lib/auth/login-branch-match"

describe("isLoginBranchAllowed", () => {
  it("allows home branch", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b1", allowAnyBranchLogin: false, role: "SH_STAFF" },
        { branchId: "b1", branchType: "SH" }
      )
    ).toBe(true)
  })

  it("rejects cross-branch for normal staff", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b-home", allowAnyBranchLogin: false, role: "SH_STAFF" },
        { branchId: "b-other", branchType: "SH" }
      )
    ).toBe(false)
  })

  it("allows replacer on another shop branch", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b-home", allowAnyBranchLogin: true, role: "SH_STAFF" },
        { branchId: "b-other", branchType: "SH" }
      )
    ).toBe(true)
  })

  it("rejects replacer on HO branch preview", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b-home", allowAnyBranchLogin: true, role: "SH_STAFF" },
        { branchId: "b-ho", branchType: "HO" }
      )
    ).toBe(false)
  })

  it("allows HO_ADMIN on home HO branch or shop branch", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b-ho", allowAnyBranchLogin: false, role: "HO_ADMIN" },
        { branchId: "b-shop", branchType: "SH" }
      )
    ).toBe(true)
    expect(
      isLoginBranchAllowed(
        { branchId: "b-ho", allowAnyBranchLogin: false, role: "HO_ADMIN" },
        { branchId: "b-ho", branchType: "HO" }
      )
    ).toBe(true)
  })
})
