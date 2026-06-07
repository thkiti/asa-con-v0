import { isLoginBranchAllowed } from "@/lib/auth/login-branch-match"

describe("isLoginBranchAllowed", () => {
  it("allows home branch", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b1", allowAnyBranchLogin: false },
        { branchId: "b1", branchType: "SH" }
      )
    ).toBe(true)
  })

  it("rejects cross-branch for normal staff", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b-home", allowAnyBranchLogin: false },
        { branchId: "b-other", branchType: "SH" }
      )
    ).toBe(false)
  })

  it("allows replacer on another shop branch", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b-home", allowAnyBranchLogin: true },
        { branchId: "b-other", branchType: "SH" }
      )
    ).toBe(true)
  })

  it("rejects replacer on HO branch preview", () => {
    expect(
      isLoginBranchAllowed(
        { branchId: "b-home", allowAnyBranchLogin: true },
        { branchId: "b-ho", branchType: "HO" }
      )
    ).toBe(false)
  })
})
