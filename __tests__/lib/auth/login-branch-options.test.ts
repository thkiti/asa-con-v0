import {
  formatLoginBranchOptionLabel,
  resolveLoginBranchOptions,
  shouldLoadShopBranches,
} from "@/lib/auth/login-branch-options"

const shopBranches = [
  { id: "branch-sh-home", code: "SH999", name: "Buffer" },
  { id: "branch-sh-1", code: "SH001", name: "Shop 1" },
]

describe("shouldLoadShopBranches", () => {
  it("returns false before staff preview", () => {
    expect(shouldLoadShopBranches(null)).toBe(false)
  })

  it("returns true for replacer SH_STAFF and HO_ADMIN", () => {
    expect(
      shouldLoadShopBranches({
        staffId: "002",
        staffName: "Replacer",
        role: "SH_STAFF",
        branchId: "branch-sh-home",
        branchCode: "SH999",
        branchName: "Buffer",
        allowAnyBranchLogin: true,
      })
    ).toBe(true)
    expect(
      shouldLoadShopBranches({
        staffId: "001",
        staffName: "Admin",
        role: "HO_ADMIN",
        branchId: "branch-ho",
        branchCode: "HO999",
        branchName: "Head Office",
        allowAnyBranchLogin: false,
      })
    ).toBe(true)
    expect(
      shouldLoadShopBranches({
        staffId: "003",
        staffName: "Finance",
        role: "HO_FINANCE",
        branchId: "branch-ho",
        branchCode: "HO999",
        branchName: "Head Office",
        allowAnyBranchLogin: false,
      })
    ).toBe(false)
  })
})

describe("resolveLoginBranchOptions", () => {
  it("returns empty list before staff preview", () => {
    expect(resolveLoginBranchOptions(null, shopBranches)).toEqual([])
  })

  it("returns home shop branch for normal SH_STAFF", () => {
    expect(
      resolveLoginBranchOptions(
        {
          staffId: "002",
          staffName: "Shop User",
          role: "SH_STAFF",
          branchId: "branch-sh-home",
          branchCode: "SH999",
          branchName: "Buffer",
          allowAnyBranchLogin: false,
        },
        shopBranches
      )
    ).toEqual([shopBranches[0]])
  })

  it("returns all shop branches for replacer SH_STAFF", () => {
    expect(
      resolveLoginBranchOptions(
        {
          staffId: "002",
          staffName: "Replacer",
          role: "SH_STAFF",
          branchId: "branch-sh-home",
          branchCode: "SH999",
          branchName: "Buffer",
          allowAnyBranchLogin: true,
        },
        shopBranches
      )
    ).toEqual(shopBranches)
  })

  it("returns HO home plus shop branches for HO_ADMIN", () => {
    expect(
      resolveLoginBranchOptions(
        {
          staffId: "001",
          staffName: "Admin",
          role: "HO_ADMIN",
          branchId: "branch-ho",
          branchCode: "HO999",
          branchName: "Head Office",
          allowAnyBranchLogin: false,
        },
        shopBranches
      )
    ).toEqual([
      {
        id: "branch-ho",
        code: "HO999",
        name: "Head Office",
      },
      ...shopBranches,
    ])
  })

  it("returns home branch for HO_FINANCE not in shop list", () => {
    expect(
      resolveLoginBranchOptions(
        {
          staffId: "003",
          staffName: "Finance",
          role: "HO_FINANCE",
          branchId: "branch-ho",
          branchCode: "HO999",
          branchName: "Head Office",
          allowAnyBranchLogin: false,
        },
        shopBranches
      )
    ).toEqual([
      {
        id: "branch-ho",
        code: "HO999",
        name: "Head Office",
      },
    ])
  })
})

describe("formatLoginBranchOptionLabel", () => {
  it("formats code and name", () => {
    expect(
      formatLoginBranchOptionLabel({
        id: "b1",
        code: "SH001",
        name: "Central Rama 2",
      })
    ).toBe("SH001 - Central Rama 2")
  })
})
