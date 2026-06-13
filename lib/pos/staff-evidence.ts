import { list } from "@vercel/blob"
import type { PrismaClient } from "@/generated/prisma/client"
import { getBlobAuthConfig } from "@/lib/catalog-image/vercel-blob"
import { CatalogImageError } from "@/lib/catalog-image/errors"
import { PosLookupError } from "./pos-errors"
import { deleteStaffEvidenceBlobUrl } from "./staff-evidence-blob-delete"
import {
  assertSafeStaffEvidenceStaffId,
  buildStaffEvidenceBlobPath,
  STAFF_EVIDENCE_PREFIX,
  type StaffEvidenceFileKind,
} from "./staff-evidence-blob"
import { uploadStaffEvidenceToBlob } from "./staff-evidence-blob-upload"

export type StaffEvidenceStatus = {
  staffId: string
  photoUploaded: boolean
  idCardUploaded: boolean
  evidenceComplete: boolean
}

export type StaffEvidenceDetail = StaffEvidenceStatus & {
  photoUrl: string | null
  idCardUrl: string | null
}

export type StaffEvidencePresence = {
  photoUploaded: boolean
  idCardUploaded: boolean
}

type StaffEvidenceDb = Pick<PrismaClient, "staff">

const EVIDENCE_PATH_PATTERN = /^staff-evidence\/(.+)-(ph|id)\.jpg$/i

function blobListOptions(prefix: string) {
  const auth = getBlobAuthConfig()
  if (auth.mode === "token") {
    return { prefix, token: auth.token }
  }
  return { prefix, oidcToken: auth.oidcToken, storeId: auth.storeId }
}

async function findStaffEvidenceBlob(
  staffId: string,
  kind: StaffEvidenceFileKind
): Promise<{ pathname: string; url: string } | null> {
  const pathname = buildStaffEvidenceBlobPath(staffId, kind)
  try {
    const prefix = pathname.replace(/\.jpg$/i, "")
    const { blobs } = await list(blobListOptions(prefix))
    const match = blobs.find((blob) => blob.pathname === pathname)
    const url = String(match?.url ?? "").trim()
    if (!match || !url) return null
    return { pathname: match.pathname, url }
  } catch (err) {
    if (err instanceof CatalogImageError) {
      throw err
    }
    const message =
      err instanceof Error ? err.message : "Failed to check staff evidence in Blob storage"
    throw new CatalogImageError(message, "BLOB_LIST_FAILED", 500)
  }
}

async function staffEvidenceBlobExists(pathname: string): Promise<boolean> {
  try {
    const prefix = pathname.replace(/\.jpg$/i, "")
    const { blobs } = await list(blobListOptions(prefix))
    return blobs.some((blob) => blob.pathname === pathname)
  } catch (err) {
    if (err instanceof CatalogImageError) {
      throw err
    }
    const message =
      err instanceof Error ? err.message : "Failed to check staff evidence in Blob storage"
    throw new CatalogImageError(message, "BLOB_LIST_FAILED", 500)
  }
}

async function resolveStaffEvidencePresence(staffId: string): Promise<StaffEvidencePresence> {
  const photoPath = buildStaffEvidenceBlobPath(staffId, "ph")
  const idPath = buildStaffEvidenceBlobPath(staffId, "id")
  const [photoUploaded, idCardUploaded] = await Promise.all([
    staffEvidenceBlobExists(photoPath),
    staffEvidenceBlobExists(idPath),
  ])
  return { photoUploaded, idCardUploaded }
}

export async function resolveStaffEvidencePresenceForStaffIds(
  staffIds: readonly string[]
): Promise<Map<string, StaffEvidencePresence>> {
  const map = new Map<string, StaffEvidencePresence>()
  const safeIds: string[] = []

  for (const rawId of staffIds) {
    try {
      const safeId = assertSafeStaffEvidenceStaffId(rawId)
      if (!map.has(safeId)) {
        map.set(safeId, { photoUploaded: false, idCardUploaded: false })
        safeIds.push(safeId)
      }
    } catch {
      // skip invalid staff codes
    }
  }

  if (safeIds.length === 0) {
    return map
  }

  const { blobs } = await list(blobListOptions(STAFF_EVIDENCE_PREFIX))
  for (const blob of blobs) {
    const match = blob.pathname.match(EVIDENCE_PATH_PATTERN)
    if (!match) continue
    const evidenceStaffId = match[1]!
    const kind = match[2]!.toLowerCase() as StaffEvidenceFileKind
    const entry = map.get(evidenceStaffId)
    if (!entry) continue
    if (kind === "ph") entry.photoUploaded = true
    if (kind === "id") entry.idCardUploaded = true
  }

  return map
}

function toStaffEvidenceStatus(
  staffId: string,
  presence: StaffEvidencePresence
): StaffEvidenceStatus {
  return {
    staffId,
    photoUploaded: presence.photoUploaded,
    idCardUploaded: presence.idCardUploaded,
    evidenceComplete: presence.photoUploaded && presence.idCardUploaded,
  }
}

async function requireStaffByStaffId(
  db: StaffEvidenceDb,
  staffId: string
): Promise<{ staffId: string }> {
  const safeStaffId = assertSafeStaffEvidenceStaffId(staffId)

  const staff = await db.staff.findUnique({
    where: { staffId: safeStaffId },
    select: {
      staffId: true,
      deleted: true,
    },
  })
  if (!staff || staff.deleted) {
    throw new PosLookupError("Staff not found", "STAFF_NOT_FOUND", 404)
  }

  return { staffId: staff.staffId }
}

export async function getStaffEvidenceStatus(
  db: StaffEvidenceDb,
  staffId: string
): Promise<StaffEvidenceStatus> {
  const staff = await requireStaffByStaffId(db, staffId)
  const presence = await resolveStaffEvidencePresence(staff.staffId)
  return toStaffEvidenceStatus(staff.staffId, presence)
}

export async function getStaffEvidenceDetail(
  db: StaffEvidenceDb,
  staffId: string
): Promise<StaffEvidenceDetail> {
  const staff = await requireStaffByStaffId(db, staffId)
  const presence = await resolveStaffEvidencePresence(staff.staffId)
  const [photoBlob, idBlob] = await Promise.all([
    presence.photoUploaded ? findStaffEvidenceBlob(staff.staffId, "ph") : Promise.resolve(null),
    presence.idCardUploaded ? findStaffEvidenceBlob(staff.staffId, "id") : Promise.resolve(null),
  ])

  return {
    ...toStaffEvidenceStatus(staff.staffId, presence),
    photoUrl: photoBlob?.url ?? null,
    idCardUrl: idBlob?.url ?? null,
  }
}

export async function deleteStaffEvidence(
  db: StaffEvidenceDb,
  staffId: string
): Promise<StaffEvidenceStatus> {
  const staff = await requireStaffByStaffId(db, staffId)

  for (const kind of ["ph", "id"] as const) {
    const blob = await findStaffEvidenceBlob(staff.staffId, kind)
    if (blob) {
      await deleteStaffEvidenceBlobUrl(blob.url)
    }
  }

  return getStaffEvidenceStatus(db, staff.staffId)
}

async function assertStaffEvidenceNotComplete(staffId: string): Promise<void> {
  const presence = await resolveStaffEvidencePresence(staffId)
  if (presence.photoUploaded && presence.idCardUploaded) {
    throw new PosLookupError(
      "Staff evidence is already complete and cannot be replaced",
      "STAFF_EVIDENCE_ALREADY_COMPLETE",
      409
    )
  }
}

async function assertStaffEvidenceFileMissing(
  staffId: string,
  kind: StaffEvidenceFileKind
): Promise<void> {
  const pathname = buildStaffEvidenceBlobPath(staffId, kind)
  const exists = await staffEvidenceBlobExists(pathname)
  if (exists) {
    throw new PosLookupError(
      `Staff evidence file already exists: ${kind}`,
      "STAFF_EVIDENCE_FILE_EXISTS",
      409
    )
  }
}

export async function submitStaffEvidence(
  db: StaffEvidenceDb,
  input: {
    staffId: string
    photoBuffer: Buffer
    idCardBuffer: Buffer
    contentType?: string
  }
): Promise<StaffEvidenceStatus> {
  const staff = await db.staff.findUnique({
    where: { staffId: input.staffId },
    select: { staffId: true, deleted: true },
  })
  if (!staff || staff.deleted) {
    throw new PosLookupError("Staff not found", "STAFF_NOT_FOUND", 404)
  }

  await assertStaffEvidenceNotComplete(staff.staffId)
  await assertStaffEvidenceFileMissing(staff.staffId, "ph")
  await assertStaffEvidenceFileMissing(staff.staffId, "id")

  const contentType = input.contentType?.trim() || "image/jpeg"

  await uploadStaffEvidenceToBlob({
    staffId: staff.staffId,
    kind: "ph",
    fileBuffer: input.photoBuffer,
    contentType,
  })
  await uploadStaffEvidenceToBlob({
    staffId: staff.staffId,
    kind: "id",
    fileBuffer: input.idCardBuffer,
    contentType,
  })

  return getStaffEvidenceStatus(db, staff.staffId)
}
