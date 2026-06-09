import { Role } from "@/generated/prisma/client"
import { canStaffUseBranch } from "@/lib/staff/canStaffUseBranch"

const activeShop = {
  id: "branch-sh-1",
  type: "SH",
  isActive: true,
  deleted: false,
}

const activeHo = {
  id: "branch-ho",
  type: "HO",
  isActive: true,
  deleted: false,
}

const inactiveShop = {
  ...activeShop,
  isActive: false,
}

describe("canStaffUseBranch", () => {
  it("allows staff on home branch", () => {
    expect(
      canStaffUseBranch(
        {
          branchId: "branch-sh-1",
          role: Role.SH_STAFF,
          allowAnyBranchLogin: false,
        },
        activeShop
      )
    ).toBe(true)
  })

  it("rejects normal SH_STAFF on another shop branch", () => {
    expect(
      canStaffUseBranch(
        {
          branchId: "branch-sh-home",
          role: Role.SH_STAFF,
          allowAnyBranchLogin: false,
        },
        activeShop
      )
    ).toBe(false)
  })

  it("allows replacer SH_STAFF on another active shop branch", () => {
    expect(
      canStaffUseBranch(
        {
          branchId: "branch-sh-home",
          role: Role.SH_STAFF,
          allowAnyBranchLogin: true,
        },
        activeShop
      )
    ).toBe(true)
  })

  it("rejects replacer on HO branch", () => {
    expect(
      canStaffUseBranch(
        {
          branchId: "branch-sh-home",
          role: Role.SH_STAFF,
          allowAnyBranchLogin: true,
        },
        activeHo
      )
    ).toBe(false)
  })

  it("rejects replacer on inactive shop branch", () => {
    expect(
      canStaffUseBranch(
        {
          branchId: "branch-sh-home",
          role: Role.SH_STAFF,
          allowAnyBranchLogin: true,
        },
        inactiveShop
      )
    ).toBe(false)
  })

  it("allows HO_ADMIN on shop branch only", () => {
    expect(
      canStaffUseBranch(
        {
          branchId: "branch-ho",
          role: Role.HO_ADMIN,
          allowAnyBranchLogin: false,
        },
        activeShop
      )
    ).toBe(true)
    expect(
      canStaffUseBranch(
        {
          branchId: "branch-ho",
          role: Role.HO_ADMIN,
          allowAnyBranchLogin: false,
        },
        activeHo
      )
    ).toBe(false)
  })
})
