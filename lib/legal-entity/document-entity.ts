import type { Role } from "@/generated/prisma/client"

import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  HO_BRANCH_CODE,
  type DocumentEntityCode,
  LEGAL_ENTITY_CODES,
} from "./constants"

export class DocumentEntityError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "DocumentEntityError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function parseDocumentEntityCode(
  value: unknown
): DocumentEntityCode | null {
  const raw = String(value ?? "").trim()
  if (raw === "AS" || raw === "AD") return raw
  return null
}

/** HO999 finance/admin may choose document entity at login or via session toggle. */
export function canChooseDocumentEntity(
  role: Role,
  branchCode: string
): boolean {
  return (
    branchCode === HO_BRANCH_CODE &&
    (role === "HO_FINANCE" || role === "HO_ADMIN")
  )
}

export function resolveLoginDocumentEntityCode(input: {
  role: Role
  branchCode: string
  requested?: unknown
}): DocumentEntityCode {
  const requested = parseDocumentEntityCode(input.requested)

  if (canChooseDocumentEntity(input.role, input.branchCode)) {
    return requested ?? DEFAULT_DOCUMENT_ENTITY_CODE
  }

  if (requested && requested !== DEFAULT_DOCUMENT_ENTITY_CODE) {
    throw new DocumentEntityError(
      "Document entity AD is not allowed for this branch or role",
      "DOCUMENT_ENTITY_NOT_ALLOWED",
      403
    )
  }

  return DEFAULT_DOCUMENT_ENTITY_CODE
}

export function assertDocumentEntityChangeAllowed(input: {
  role: Role
  branchCode: string
  requested: unknown
}): DocumentEntityCode {
  const code = parseDocumentEntityCode(input.requested)
  if (!code) {
    throw new DocumentEntityError(
      `documentEntityCode must be one of: ${LEGAL_ENTITY_CODES.join(", ")}`,
      "INVALID_DOCUMENT_ENTITY",
      400
    )
  }

  if (!canChooseDocumentEntity(input.role, input.branchCode)) {
    throw new DocumentEntityError(
      "Document entity cannot be changed for this session",
      "DOCUMENT_ENTITY_NOT_ALLOWED",
      403
    )
  }

  return code
}
