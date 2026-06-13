import { listBranches } from "@/lib/master/branch-list"

describe("listBranches", () => {
  it("filters by code, name, type, and activeOnly when not in trash", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const db = { branch: { findMany } }

    await listBranches(db, {
      mode: "active",
      code: "SH",
      name: "shop",
      type: "SH",
      activeOnly: true,
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deleted: false,
          isActive: true,
          code: { contains: "SH", mode: "insensitive" },
          name: { contains: "shop", mode: "insensitive" },
          type: "SH",
        }),
      })
    )
  })

  it("lists trash without activeOnly filter", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const db = { branch: { findMany } }

    await listBranches(db, {
      mode: "trash",
      code: "",
      name: "",
      type: "",
      activeOnly: false,
    })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deleted: true },
      })
    )
  })
})
