import { Role } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import { assertStaffPasswordPlain, resolveStaffPasswordForCreate } from "./staff-password"

const VALID_ROLES = new Set<string>(Object.values(Role))

function rejectImmutableFields(body: Record<string, unknown>): void {
  if ("staffId" in body && body.staffId !== undefined) {
    throw new MasterDomainError(
      "Staff ID cannot be changed after creation",
      "STAFF_ID_IMMUTABLE",
      400
    )
  }
}

function parseRole(value: unknown): Role {
  const raw = String(value ?? "").trim()
  if (!VALID_ROLES.has(raw)) {
    throw new MasterDomainError("Invalid role", "VALIDATION_ERROR", 400)
  }
  return raw as Role
}

function parseBranchId(value: unknown): string {
  const branchId = String(value ?? "").trim()
  if (!branchId) {
    throw new MasterDomainError("Branch is required", "VALIDATION_ERROR", 400)
  }
  return branchId
}

export type CreateStaffInput = {
  staffId: string
  name: string
  role: Role
  branchId: string
  password: string
}

export type UpdateStaffInput = {
  name: string
  role: Role
  branchId: string
}

export type PatchStaffBody =
  | { action: "update"; name: string; role: Role; branchId: string }
  | { action: "delete" }
  | { action: "restore" }
  | { action: "resetPassword"; password: string }

export type StaffMutationContext = {
  actorStaffId?: string
}

export function parseCreateStaffBody(body: unknown): CreateStaffInput {
  if (!body || typeof body !== "object") {
    throw new MasterDomainError("Invalid request body", "VALIDATION_ERROR", 400)
  }
  const record = body as Record<string, unknown>
  const staffId = String(record.staffId ?? "").trim()
  if (!staffId) {
    throw new MasterDomainError("Staff ID is required", "VALIDATION_ERROR", 400)
  }
  const name = String(record.name ?? "").trim()
  if (!name) {
    throw new MasterDomainError("Name is required", "VALIDATION_ERROR", 400)
  }

  const password = resolveStaffPasswordForCreate(record.password)

  return {
    staffId,
    name,
    role: parseRole(record.role),
    branchId: parseBranchId(record.branchId),
    password,
  }
}

export function parsePatchStaffBody(body: unknown): PatchStaffBody {
  if (!body || typeof body !== "object") {
    throw new MasterDomainError("Invalid request body", "VALIDATION_ERROR", 400)
  }
  const record = body as Record<string, unknown>
  rejectImmutableFields(record)

  if (record.deleted === true) {
    return { action: "delete" }
  }
  if (record.deleted === false) {
    return { action: "restore" }
  }

  const hasPassword = "password" in record && record.password !== undefined
  const hasProfile =
    record.name !== undefined || record.role !== undefined || record.branchId !== undefined

  if (hasPassword && hasProfile) {
    throw new MasterDomainError(
      "Password reset cannot be combined with profile update",
      "VALIDATION_ERROR",
      400
    )
  }

  if (hasPassword) {
    return {
      action: "resetPassword",
      password: assertStaffPasswordPlain(String(record.password)),
    }
  }

  const name = String(record.name ?? "").trim()
  if (!name) {
    throw new MasterDomainError("Name is required", "VALIDATION_ERROR", 400)
  }

  return {
    action: "update",
    name,
    role: parseRole(record.role),
    branchId: parseBranchId(record.branchId),
  }
}
