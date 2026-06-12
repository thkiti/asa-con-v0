import { randomUUID } from "crypto"

import type { Role } from "@/generated/prisma/client"
import {
  DocumentEntityError,
  resolveLoginDocumentEntityCode,
} from "@/lib/legal-entity"
import { prisma } from "@/lib/shared/prisma"
import { canStaffUseBranch } from "@/lib/staff/canStaffUseBranch"

import { DEV_PERIOD_ADMIN_STAFF_CODE } from "./period-admin-staff"
import {
  defaultRedirectAfterLogin,
  resolveSafeReturnTo,
} from "./session-cookies"
import type { SessionUser } from "./types"
import { verifyStaffPassword } from "./verify-staff-password"

export const CREDENTIAL_LOGIN_INVALID_MESSAGE =
  "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"

export const CREDENTIAL_LOGIN_BRANCH_INACTIVE_MESSAGE = "สาขาของพนักงานไม่พร้อมใช้งาน"

export const CREDENTIAL_LOGIN_DEV_STAFF_BLOCKED_MESSAGE =
  "รหัส DEV ใช้สำหรับ development เท่านั้น ไม่สามารถ Login ผ่านหน้านี้"

export const CREDENTIAL_LOGIN_BRANCH_MISMATCH_MESSAGE =
  "พนักงานไม่สังกัดสาขานี้"

export class CredentialLoginError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "CredentialLoginError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export type CredentialLoginInput = {
  username: string
  password: string
  branchCode: string
  returnTo?: string
  documentEntityCode?: string
}

export type CredentialLoginResult = {
  sessionUser: SessionUser
  redirectTo: string
}

function rejectInvalidCredentials(): never {
  throw new CredentialLoginError(
    CREDENTIAL_LOGIN_INVALID_MESSAGE,
    "INVALID_CREDENTIALS",
    401
  )
}

export async function credentialLogin(
  input: CredentialLoginInput
): Promise<CredentialLoginResult> {
  const username = input.username.trim()
  const password = input.password
  const branchCode = input.branchCode.trim()

  if (!username) {
    throw new CredentialLoginError(
      "Username is required",
      "USERNAME_REQUIRED",
      400
    )
  }

  if (!password) {
    throw new CredentialLoginError(
      "Password is required",
      "PASSWORD_REQUIRED",
      400
    )
  }

  if (!branchCode) {
    throw new CredentialLoginError(
      "Branch code is required",
      "BRANCH_CODE_REQUIRED",
      400
    )
  }

  if (username === DEV_PERIOD_ADMIN_STAFF_CODE) {
    throw new CredentialLoginError(
      CREDENTIAL_LOGIN_DEV_STAFF_BLOCKED_MESSAGE,
      "DEV_STAFF_NOT_ALLOWED",
      403
    )
  }

  const staff = await prisma.staff.findUnique({
    where: { staffId: username },
    include: {
      branch: {
        select: { id: true, code: true, name: true, isActive: true, deleted: true },
      },
    },
  })

  if (!staff || staff.deleted) {
    rejectInvalidCredentials()
  }

  if (staff.branch.deleted || !staff.branch.isActive) {
    throw new CredentialLoginError(
      CREDENTIAL_LOGIN_BRANCH_INACTIVE_MESSAGE,
      "BRANCH_INACTIVE",
      409
    )
  }

  const loginBranch = await prisma.branch.findUnique({
    where: { code: branchCode },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      isActive: true,
      deleted: true,
    },
  })

  if (
    !loginBranch ||
    !canStaffUseBranch(
      {
        branchId: staff.branchId,
        role: staff.role,
        allowAnyBranchLogin: staff.allowAnyBranchLogin,
      },
      loginBranch
    )
  ) {
    throw new CredentialLoginError(
      CREDENTIAL_LOGIN_BRANCH_MISMATCH_MESSAGE,
      "BRANCH_MISMATCH",
      403
    )
  }

  const passwordValid = await verifyStaffPassword(password, staff.password)
  if (!passwordValid) {
    rejectInvalidCredentials()
  }

  let documentEntityCode
  try {
    documentEntityCode = resolveLoginDocumentEntityCode({
      role: staff.role as Role,
      branchCode: loginBranch.code,
      requested: input.documentEntityCode,
    })
  } catch (err) {
    if (err instanceof DocumentEntityError) {
      throw new CredentialLoginError(err.message, err.code, err.httpStatus)
    }
    throw err
  }

  const sessionUser: SessionUser = {
    sessionId: randomUUID(),
    userId: staff.id,
    role: staff.role as Role,
    staffId: staff.staffId,
    name: staff.name,
    branchId: loginBranch.id,
    branchCode: loginBranch.code,
    branchName: loginBranch.name,
    documentEntityCode,
  }

  const safeReturnTo = resolveSafeReturnTo(input.returnTo, staff.role as Role)
  const redirectTo =
    safeReturnTo ??
    defaultRedirectAfterLogin(staff.role as Role, loginBranch.code)

  return { sessionUser, redirectTo }
}
