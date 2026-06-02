import { randomUUID } from "crypto"

import type { Role } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"

import {
  createSessionUser,
  defaultRedirectForRole,
  resolveSafeReturnTo,
} from "./session-cookies"
import { DEV_PERIOD_ADMIN_STAFF_CODE } from "./period-admin-staff"

export const BOOTSTRAP_LOGIN_STAFF_NOT_FOUND_MESSAGE =
  "ไม่พบรหัสพนักงานนี้ กรุณานำเข้าข้อมูลพนักงานก่อน"

export const BOOTSTRAP_LOGIN_DEV_STAFF_BLOCKED_MESSAGE =
  "รหัส DEV ใช้สำหรับ development เท่านั้น ไม่สามารถ Login ผ่านหน้านี้"

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

  if (staffId === DEV_PERIOD_ADMIN_STAFF_CODE) {
    throw new BootstrapLoginError(
      BOOTSTRAP_LOGIN_DEV_STAFF_BLOCKED_MESSAGE,
      "DEV_STAFF_NOT_ALLOWED",
      403
    )
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
    throw new BootstrapLoginError(
      BOOTSTRAP_LOGIN_STAFF_NOT_FOUND_MESSAGE,
      "STAFF_NOT_FOUND",
      404
    )
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
