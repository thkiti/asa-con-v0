import { getStaffBootstrapStatus } from "@/lib/auth/staff-bootstrap-status"
import { DEV_PERIOD_ADMIN_STAFF_CODE } from "@/lib/auth/period-admin-staff"

describe("getStaffBootstrapStatus", () => {
  it("treats DEV-only seed as no imported staff", async () => {
    const db = {
      staff: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    }

    await expect(getStaffBootstrapStatus(db as never)).resolves.toEqual({
      importedStaffCount: 0,
      hasBootstrapAdmin: false,
    })

    expect(db.staff.count).toHaveBeenCalledWith({
      where: {
        deleted: false,
        staffId: { not: DEV_PERIOD_ADMIN_STAFF_CODE },
      },
    })
  })

  it("detects imported bootstrap admin 001", async () => {
    const db = {
      staff: {
        count: jest.fn().mockResolvedValue(12),
        findUnique: jest.fn().mockResolvedValue({ deleted: false }),
      },
    }

    await expect(getStaffBootstrapStatus(db as never)).resolves.toEqual({
      importedStaffCount: 12,
      hasBootstrapAdmin: true,
    })
  })
})
