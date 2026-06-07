import type { PrismaClient } from "@/generated/prisma/client"
import { deleteStaff } from "./delete-staff"
import type { PatchStaffBody, StaffMutationContext } from "./parse-staff-mutation"
import { resetStaffPassword } from "./reset-staff-password"
import { restoreStaff } from "./restore-staff"
import { updateStaff } from "./update-staff"
import type { StaffListItem } from "./types"

type StaffDb = Pick<PrismaClient, "staff" | "branch">

export async function patchStaff(
  db: StaffDb,
  id: string,
  body: PatchStaffBody,
  context: StaffMutationContext = {}
): Promise<StaffListItem> {
  if (body.action === "delete") {
    return deleteStaff(db, id, context)
  }
  if (body.action === "restore") {
    return restoreStaff(db, id)
  }
  if (body.action === "resetPassword") {
    return resetStaffPassword(db, id, body.password)
  }
  return updateStaff(db, id, {
    name: body.name,
    role: body.role,
    branchId: body.branchId,
    posCanCollect: body.posCanCollect,
    allowAnyBranchLogin: body.allowAnyBranchLogin,
  }, context)
}
