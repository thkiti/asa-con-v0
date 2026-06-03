import bcrypt from "bcryptjs"
import { STAFF_DEFAULT_PASSWORD } from "@/lib/import/staff-password"
import { MasterDomainError } from "./errors"

export const MIN_STAFF_PASSWORD_LENGTH = 4

export function resolveStaffPasswordForCreate(plain: unknown): string {
  if (plain === undefined || plain === null || String(plain).length === 0) {
    return STAFF_DEFAULT_PASSWORD
  }
  return assertStaffPasswordPlain(String(plain))
}

export function assertStaffPasswordPlain(plain: string): string {
  const trimmed = plain.trim()
  if (!trimmed) {
    throw new MasterDomainError("Password is required", "PASSWORD_REQUIRED", 400)
  }
  if (trimmed.length < MIN_STAFF_PASSWORD_LENGTH) {
    throw new MasterDomainError(
      `Password must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters`,
      "PASSWORD_TOO_SHORT",
      400
    )
  }
  return trimmed
}

export async function hashStaffPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}
