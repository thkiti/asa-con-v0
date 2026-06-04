import { Prisma } from "@/generated/prisma/client"
import { BranchType } from "@/lib/shared"
import { normalizeBranchCodeForCreate } from "@/lib/master/branch-code"
import { createBranch } from "@/lib/master/create-branch"
import { deleteBranch } from "@/lib/master/delete-branch"
import { MasterDomainError } from "@/lib/master/errors"
import {
  parseCreateBranchBody,
  parsePatchBranchBody,
} from "@/lib/master/parse-branch-mutation"
import { restoreBranch } from "@/lib/master/restore-branch"
import { updateBranch } from "@/lib/master/update-branch"
import {
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
} from "@/lib/import/constants"

describe("normalizeBranchCodeForCreate", () => {
  it("pads numeric shop codes", () => {
    expect(normalizeBranchCodeForCreate("2", BranchType.SH)).toBe("SH002")
  })

  it("rejects empty code", () => {
    expect(() => normalizeBranchCodeForCreate("", BranchType.HO)).toThrow(
      MasterDomainError
    )
  })
})

describe("parseCreateBranchBody", () => {
  it("parses create payload with defaults isActive true", () => {
    expect(
      parseCreateBranchBody({
        code: "SH010",
        name: "Shop 10",
        type: "SH",
      })
    ).toEqual({
      code: "SH010",
      name: "Shop 10",
      type: BranchType.SH,
      isActive: true,
      address: null,
      phone: null,
      taxId: null,
    })
  })

  it("parses optional address, phone, and taxId on create", () => {
    expect(
      parseCreateBranchBody({
        code: "HO999",
        name: "Head Office",
        type: "HO",
        address: "  HQ Road  ",
        phone: " 021234567 ",
        taxId: " 0123456789012 ",
      })
    ).toEqual({
      code: "HO999",
      name: "Head Office",
      type: BranchType.HO,
      isActive: true,
      address: "HQ Road",
      phone: "021234567",
      taxId: "0123456789012",
    })
  })

  it("requires code, name, and type", () => {
    expect(() => parseCreateBranchBody({ name: "X", type: "HO" })).toThrow(
      expect.objectContaining({ code: "VALIDATION_ERROR" })
    )
  })
})

describe("parsePatchBranchBody", () => {
  it("parses update with name and isActive", () => {
    expect(
      parsePatchBranchBody({ name: "Renamed", isActive: false })
    ).toEqual({
      action: "update",
      name: "Renamed",
      isActive: false,
      address: null,
      phone: null,
      taxId: null,
    })
  })

  it("parses optional address, phone, and taxId on update", () => {
    expect(
      parsePatchBranchBody({
        name: "Shop",
        isActive: true,
        address: "Line 1",
        phone: "0812345678",
        taxId: "POS-99",
      })
    ).toEqual({
      action: "update",
      name: "Shop",
      isActive: true,
      address: "Line 1",
      phone: "0812345678",
      taxId: "POS-99",
    })
  })

  it("parses soft delete", () => {
    expect(parsePatchBranchBody({ deleted: true })).toEqual({ action: "delete" })
  })

  it("parses restore", () => {
    expect(parsePatchBranchBody({ deleted: false })).toEqual({ action: "restore" })
  })

  it("rejects code change with CODE_IMMUTABLE", () => {
    expect(() => parsePatchBranchBody({ code: "SH999", name: "X", isActive: true })).toThrow(
      expect.objectContaining({ code: "CODE_IMMUTABLE" })
    )
  })

  it("rejects type change with TYPE_IMMUTABLE", () => {
    expect(() =>
      parsePatchBranchBody({ type: "HO", name: "X", isActive: true })
    ).toThrow(expect.objectContaining({ code: "TYPE_IMMUTABLE" }))
  })
})

describe("createBranch", () => {
  it("creates branch with normalized code", async () => {
    const create = jest.fn().mockResolvedValue({
      id: "b2",
      code: "SH002",
      name: "Shop 2",
      type: BranchType.SH,
      isActive: true,
      deleted: false,
    })
    const db = { branch: { create } }

    const item = await createBranch(db, {
      code: "2",
      name: "Shop 2",
      type: BranchType.SH,
      isActive: true,
    })

    expect(item.code).toBe("SH002")
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "SH002", deleted: false }),
      })
    )
  })

  it("maps duplicate code to BRANCH_CODE_EXISTS", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    })
    const db = {
      branch: {
        create: jest.fn().mockRejectedValue(err),
      },
    }

    await expect(
      createBranch(db, {
        code: "SH002",
        name: "Shop",
        type: BranchType.SH,
        isActive: true,
      })
    ).rejects.toMatchObject({ code: "BRANCH_CODE_EXISTS", httpStatus: 409 })
  })
})

describe("updateBranch", () => {
  it("updates name, isActive, and contact fields", async () => {
    const db = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({ id: "b1" }),
        update: jest.fn().mockResolvedValue({
          id: "b1",
          code: "SH003",
          name: "New name",
          type: BranchType.SH,
          address: "Addr",
          phone: "02-000",
          taxId: "MID-1",
          isActive: false,
          deleted: false,
        }),
      },
    }

    const item = await updateBranch(db, "b1", {
      name: "New name",
      isActive: false,
      address: "Addr",
      phone: "02-000",
      taxId: "MID-1",
    })

    expect(item.name).toBe("New name")
    expect(item.isActive).toBe(false)
    expect(db.branch.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: {
        name: "New name",
        isActive: false,
        address: "Addr",
        phone: "02-000",
        taxId: "MID-1",
      },
      select: expect.any(Object),
    })
  })
})

describe("deleteBranch", () => {
  it("soft deletes without changing isActive", async () => {
    const db = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({
          id: "b2",
          code: "SH010",
          name: "Shop",
          type: BranchType.SH,
          isActive: false,
          deleted: false,
        }),
        update: jest.fn().mockResolvedValue({
          id: "b2",
          code: "SH010",
          name: "Shop",
          type: BranchType.SH,
          isActive: false,
          deleted: true,
        }),
      },
    }

    const item = await deleteBranch(db, "b2")
    expect(item.deleted).toBe(true)
    expect(item.isActive).toBe(false)
    expect(db.branch.update).toHaveBeenCalledWith({
      where: { id: "b2" },
      data: { deleted: true },
      select: expect.any(Object),
    })
  })

  it("allows soft delete of normal shop SH001", async () => {
    const db = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({
          id: "b-sh001",
          code: "SH001",
          name: "Shop One",
          type: BranchType.SH,
          isActive: true,
          deleted: false,
        }),
        update: jest.fn().mockResolvedValue({
          id: "b-sh001",
          code: "SH001",
          name: "Shop One",
          type: BranchType.SH,
          isActive: true,
          deleted: true,
        }),
      },
    }

    const item = await deleteBranch(db, "b-sh001")
    expect(item.deleted).toBe(true)
    expect(db.branch.update).toHaveBeenCalled()
  })

  it.each([BOOTSTRAP_HO_BRANCH_CODE, BOOTSTRAP_SHOP_BRANCH_CODE])(
    "protects bootstrap code %s",
    async (code) => {
      const db = {
        branch: {
          findUnique: jest.fn().mockResolvedValue({
            id: "b1",
            code,
            name: "Bootstrap",
            type: code.startsWith("HO") ? BranchType.HO : BranchType.SH,
            isActive: true,
            deleted: false,
          }),
          update: jest.fn(),
        },
      }

      await expect(deleteBranch(db, "b1")).rejects.toMatchObject({
        code: "BOOTSTRAP_BRANCH_PROTECTED",
        httpStatus: 409,
      })
      expect(db.branch.update).not.toHaveBeenCalled()
    }
  )
})

describe("restoreBranch", () => {
  it("clears deleted only and preserves isActive", async () => {
    const db = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({ id: "b2" }),
        update: jest.fn().mockResolvedValue({
          id: "b2",
          code: "SH010",
          name: "Shop",
          type: BranchType.SH,
          isActive: false,
          deleted: false,
        }),
      },
    }

    const item = await restoreBranch(db, "b2")
    expect(item.deleted).toBe(false)
    expect(item.isActive).toBe(false)
    expect(db.branch.update).toHaveBeenCalledWith({
      where: { id: "b2" },
      data: { deleted: false },
      select: expect.any(Object),
    })
  })
})
