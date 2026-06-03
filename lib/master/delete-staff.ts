import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import type { StaffMutationContext } from "./parse-staff-mutation"
import {
  assertBootstrapStaffDeleteAllowed,
  assertLastHoAdminChangeAllowed,
  assertMasterStaffMutable,
  assertNotSelfDelete,
} from "./staff-guards"
import { staffSelectWithBranch, toStaffListItem } from "./staff-mapper"
import type { StaffListItem } from "./types"

type StaffDb = Pick<PrismaClient, "staff" | "branch">

export async function deleteStaff(
  db: StaffDb,
  id: string,
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
  assertBootstrapStaffDeleteAllowed(existing)
  assertNotSelfDelete(context.actorStaffId, existing.staffId)

  await assertLastHoAdminChangeAllowed({
    db,
    staffRecordId: existing.id,
    currentRole: existing.role,
    nextRole: "SH_STAFF",
    nextBranch: existing.branch,
  })

  const updated = await db.staff.update({
    where: { id },
    data: { deleted: true },
    select: staffSelectWithBranch,
  })

  return toStaffListItem(updated)
}
