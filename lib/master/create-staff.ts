import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import type { CreateStaffInput } from "./parse-staff-mutation"
import {
  assertReservedStaffIdForCreate,
} from "./staff-guards"
import { loadAssignableBranch } from "./staff-branch"
import { hashStaffPassword } from "./staff-password"
import { staffSelectWithBranch, toStaffListItem } from "./staff-mapper"
import type { StaffListItem } from "./types"
import { assertStaffRoleBranch } from "./validate-staff-role-branch"

type StaffDb = Pick<PrismaClient, "staff" | "branch">

export async function createStaff(
  db: StaffDb,
  input: CreateStaffInput
): Promise<StaffListItem> {
  assertReservedStaffIdForCreate(input.staffId)

  const branch = await loadAssignableBranch(db, input.branchId)
  assertStaffRoleBranch(input.role, branch)

  const passwordHash = await hashStaffPassword(input.password)

  try {
    const created = await db.staff.create({
      data: {
        staffId: input.staffId,
        name: input.name.trim(),
        role: input.role,
        branchId: branch.id,
        password: passwordHash,
        deleted: false,
      },
      select: staffSelectWithBranch,
    })
    return toStaffListItem(created)
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new MasterDomainError(
        `Staff ID already exists: ${input.staffId}`,
        "STAFF_ID_EXISTS",
        409
      )
    }
    throw err
  }
}
