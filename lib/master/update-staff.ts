import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import type { StaffMutationContext, UpdateStaffInput } from "./parse-staff-mutation"
import {
  assertLastHoAdminChangeAllowed,
  assertMasterStaffMutable,
} from "./staff-guards"
import { loadAssignableBranch } from "./staff-branch"
import { staffSelectWithBranch, toStaffListItem } from "./staff-mapper"
import type { StaffListItem } from "./types"
import { assertStaffRoleBranch } from "./validate-staff-role-branch"

type StaffDb = Pick<PrismaClient, "staff" | "branch">

export async function updateStaff(
  db: StaffDb,
  id: string,
  input: UpdateStaffInput,
  context: StaffMutationContext = {}
): Promise<StaffListItem> {
  const existing = await db.staff.findUnique({
    where: { id },
    select: {
      id: true,
      staffId: true,
      role: true,
      branch: { select: { type: true, isActive: true, deleted: true } },
    },
  })

  if (!existing) {
    throw new MasterDomainError("Staff not found", "STAFF_NOT_FOUND", 404)
  }

  assertMasterStaffMutable(existing)

  const branch = await loadAssignableBranch(db, input.branchId)
  assertStaffRoleBranch(input.role, branch)

  await assertLastHoAdminChangeAllowed({
    db,
    staffRecordId: existing.id,
    currentRole: existing.role,
    nextRole: input.role,
    nextBranch: branch,
  })

  const updated = await db.staff.update({
    where: { id },
    data: {
      name: input.name.trim(),
      role: input.role,
      branchId: branch.id,
    },
    select: staffSelectWithBranch,
  })

  return toStaffListItem(updated)
}
