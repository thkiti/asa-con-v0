import { listStaff } from "@/lib/master/staff-list"

describe("listStaff", () => {
  it("maps rows without password field", async () => {
    const db = {
      staff: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "s1",
            staffId: "001",
            password: "hashed-secret",
            name: "Admin",
            role: "HO_ADMIN",
            deleted: false,
            branchId: "b1",
            branch: { code: "HO999", name: "Head Office" },
          },
        ]),
      },
    }

    const items = await listStaff(db, {
      mode: "active",
      q: "",
      role: null,
      branchCode: "",
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      id: "s1",
      staffId: "001",
      name: "Admin",
      role: "HO_ADMIN",
      deleted: false,
      branchId: "b1",
      branchCode: "HO999",
      branchName: "Head Office",
    })
    expect(items[0]).not.toHaveProperty("password")
  })
})
