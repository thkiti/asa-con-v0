import { BranchType } from "@/lib/shared"
import { MasterDomainError } from "./errors"

const BRANCH_TYPES = new Set<string>([BranchType.HO, BranchType.SH])

function rejectImmutableFields(body: Record<string, unknown>): void {
  if ("code" in body && body.code !== undefined) {
    throw new MasterDomainError(
      "Branch code cannot be changed after creation",
      "CODE_IMMUTABLE",
      400
    )
  }
  if ("type" in body && body.type !== undefined) {
    throw new MasterDomainError(
      "Branch type cannot be changed after creation",
      "TYPE_IMMUTABLE",
      400
    )
  }
}

function parseBranchType(value: unknown): BranchType {
  const raw = String(value ?? "").trim().toUpperCase()
  if (!BRANCH_TYPES.has(raw)) {
    throw new MasterDomainError(
      "Branch type must be HO or SH",
      "VALIDATION_ERROR",
      400
    )
  }
  return raw as BranchType
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  throw new MasterDomainError(`${field} must be a boolean`, "VALIDATION_ERROR", 400)
}

export type CreateBranchInput = {
  code: string
  name: string
  type: BranchType
  isActive: boolean
}

export type UpdateBranchInput = {
  name: string
  isActive: boolean
}

export type PatchBranchBody =
  | { action: "update"; name: string; isActive: boolean }
  | { action: "delete" }
  | { action: "restore" }

export function parseCreateBranchBody(body: unknown): CreateBranchInput {
  if (!body || typeof body !== "object") {
    throw new MasterDomainError("Invalid request body", "VALIDATION_ERROR", 400)
  }
  const record = body as Record<string, unknown>
  const name = String(record.name ?? "").trim()
  if (!name) {
    throw new MasterDomainError("Branch name is required", "VALIDATION_ERROR", 400)
  }

  const type = parseBranchType(record.type)
  const code = String(record.code ?? "").trim()
  if (!code) {
    throw new MasterDomainError("Branch code is required", "VALIDATION_ERROR", 400)
  }
  const isActive =
    record.isActive === undefined ? true : parseBoolean(record.isActive, "isActive")

  return { code, name, type, isActive }
}

export function parsePatchBranchBody(body: unknown): PatchBranchBody {
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

  const name = String(record.name ?? "").trim()
  if (!name) {
    throw new MasterDomainError("Branch name is required", "VALIDATION_ERROR", 400)
  }

  if (record.isActive === undefined) {
    throw new MasterDomainError("isActive is required for update", "VALIDATION_ERROR", 400)
  }

  return {
    action: "update",
    name,
    isActive: parseBoolean(record.isActive, "isActive"),
  }
}
