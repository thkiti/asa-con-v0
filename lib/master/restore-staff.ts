import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import {
  assertMasterStaffMutable,
} from "./staff-guards"
import { staffSelectWithBranch, toStaffListItem } from "./staff-mapper"
import type { StaffListItem } from "./types"

type StaffDb = Pick<PrismaClient, "staff">

export async function restoreStaff(db: StaffDb, id: string): Promise<StaffListItem> {
  const existing = await db.staff.findUnique({
    where: { id },
    select: { id: true, staffId: true },
  })

  if (!existing) {
    throw new MasterDomainError("Staff not found", "STAFF_NOT_FOUND", 404)
  }

  assertMasterStaffMutable(existing)

  const updated = await db.staff.update({
    where: { id },
    data: { deleted: false },
    select: staffSelectWithBranch,
  })

  return toStaffListItem(updated)
}
