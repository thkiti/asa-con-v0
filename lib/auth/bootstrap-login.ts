import { randomUUID } from "crypto"

import type { Role } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"

import {
  createSessionUser,
  defaultRedirectForRole,
  resolveSafeReturnTo,
} from "./session-cookies"

export class BootstrapLoginError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "BootstrapLoginError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export type BootstrapLoginResult = {
  sessionUser: ReturnType<typeof createSessionUser>
  redirectTo: string
  staff: {
    staffId: string
    name: string
    branchCode: string
    branchName: string
    status: "active" | "inactive"
  }
}

export async function bootstrapLogin(input: {
  staffId: string
  returnTo?: string
}): Promise<BootstrapLoginResult> {
  const staffId = input.staffId.trim()
  if (!staffId) {
    throw new BootstrapLoginError("Staff ID is required", "STAFF_ID_REQUIRED", 400)
  }

  const staff = await prisma.staff.findUnique({
    where: { staffId },
    include: {
      branch: {
        select: { id: true, code: true, name: true, isActive: true, deleted: true },
      },
    },
  })

  if (!staff || staff.deleted) {
    throw new BootstrapLoginError("Staff not found", "STAFF_NOT_FOUND", 404)
  }

  if (staff.branch.deleted || !staff.branch.isActive) {
    throw new BootstrapLoginError("Staff branch inactive", "BRANCH_INACTIVE", 409)
  }

  const sessionUser = createSessionUser({
    sessionId: randomUUID(),
    role: staff.role as Role,
    staffId: staff.staffId,
    name: staff.name,
    branchId: staff.branch.id,
  })

  const safeReturnTo = resolveSafeReturnTo(input.returnTo, staff.role as Role)
  const redirectTo = safeReturnTo ?? defaultRedirectForRole(staff.role as Role)

  return {
    sessionUser,
    redirectTo,
    staff: {
      staffId: staff.staffId,
      name: staff.name,
      branchCode: staff.branch.code,
      branchName: staff.branch.name,
      status: staff.deleted ? "inactive" : "active",
    },
  }
}
