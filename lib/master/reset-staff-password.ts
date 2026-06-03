import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import { assertMasterStaffMutable } from "./staff-guards"
import { hashStaffPassword } from "./staff-password"
import { staffSelectWithBranch, toStaffListItem } from "./staff-mapper"
import type { StaffListItem } from "./types"

type StaffDb = Pick<PrismaClient, "staff">

export async function resetStaffPassword(
  db: StaffDb,
  id: string,
  password: string
): Promise<StaffListItem> {
  const existing = await db.staff.findUnique({
    where: { id },
    select: { id: true, staffId: true },
  })

  if (!existing) {
    throw new MasterDomainError("Staff not found", "STAFF_NOT_FOUND", 404)
  }

  assertMasterStaffMutable(existing)

  const passwordHash = await hashStaffPassword(password)

  const updated = await db.staff.update({
    where: { id },
    data: { password: passwordHash },
    select: staffSelectWithBranch,
  })

  return toStaffListItem(updated)
}
