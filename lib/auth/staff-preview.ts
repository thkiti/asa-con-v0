import { prisma } from "@/lib/shared/prisma"

import { DEV_PERIOD_ADMIN_STAFF_CODE } from "./period-admin-staff"
import {
  rejectLoginPreviewNotFound,
  type StaffPreview,
} from "./login-preview"

export async function previewStaffByStaffId(
  staffIdInput: string
): Promise<StaffPreview> {
  const staffId = staffIdInput.trim()
  if (!staffId || staffId === DEV_PERIOD_ADMIN_STAFF_CODE) {
    rejectLoginPreviewNotFound()
  }

  const staff = await prisma.staff.findUnique({
    where: { staffId },
    select: {
      staffId: true,
      name: true,
      role: true,
      deleted: true,
      allowAnyBranchLogin: true,
      branch: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          deleted: true,
        },
      },
    },
  })

  if (
    !staff ||
    staff.deleted ||
    staff.branch.deleted ||
    !staff.branch.isActive
  ) {
    rejectLoginPreviewNotFound()
  }

  return {
    staffId: staff.staffId,
    staffName: staff.name,
    role: staff.role,
    branchId: staff.branch.id,
    branchCode: staff.branch.code,
    branchName: staff.branch.name,
    allowAnyBranchLogin: staff.allowAnyBranchLogin,
  }
}
