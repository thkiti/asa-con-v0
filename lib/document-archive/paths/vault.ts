import { randomUUID } from "crypto"
import type { DocumentArchiveKind } from "@/generated/prisma/client"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
} from "../errors"
import { extensionForMimeType } from "../validation"

const VAULT_ARCHIVE_PREFIX = "documents/vault"

function assertSafePathSegment(value: string, label: string): string {
  const trimmed = String(value ?? "").trim()
  if (!trimmed || !/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    throw new DocumentArchiveError(
      `Invalid ${label} for archive storage path`,
      DocumentArchiveErrorCodes.INVALID_PATH
    )
  }
  if (trimmed.includes("..")) {
    throw new DocumentArchiveError(
      `Invalid ${label} for archive storage path`,
      DocumentArchiveErrorCodes.INVALID_PATH
    )
  }
  return trimmed
}

/**
 * documents/vault/{archiveKind}/{legalEntity}/{YYYY}/{MM}/{uuid}.{ext}
 */
export function buildVaultArchiveStoragePathname(input: {
  archiveKind: DocumentArchiveKind
  legalEntityCode: string
  mimeType: string
  archivedAt?: Date
}): string {
  const archiveKind = assertSafePathSegment(
    input.archiveKind.toLowerCase(),
    "archiveKind"
  )
  const legalEntityCode = assertSafePathSegment(input.legalEntityCode, "legalEntityCode")
  const { y, m } = bangkokCalendarParts(input.archivedAt ?? new Date())
  const month = String(m).padStart(2, "0")
  const ext = extensionForMimeType(input.mimeType)
  const fileId = randomUUID()
  return `${VAULT_ARCHIVE_PREFIX}/${archiveKind}/${legalEntityCode}/${y}/${month}/${fileId}.${ext}`
}
