import type { PrismaClient } from "@/generated/prisma/client"
import {
  buildStaffEvidenceMobileUploadUrl,
  mintStaffEvidenceCaptureToken,
  verifyStaffEvidenceCaptureToken,
} from "@/lib/pos/staff-evidence-capture-token"
import { getStaffEvidenceCaptureUploadStatus } from "@/lib/pos/staff-evidence-capture-upload"
import {
  deleteStaffEvidence,
  getStaffEvidenceDetail,
  replaceStaffEvidence,
  resolveStaffEvidencePresenceForStaffIds,
} from "@/lib/pos/staff-evidence"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import { MasterDomainError } from "./errors"
import { listStaff } from "./staff-list"
import type { StaffListItem, StaffListQuery } from "./types"

type StaffDb = Pick<PrismaClient, "staff">

export async function listStaffWithEvidence(
  db: StaffDb,
  query: StaffListQuery
): Promise<StaffListItem[]> {
  const items = await listStaff(db, query)
  if (items.length === 0) return items

  const presenceMap = await resolveStaffEvidencePresenceForStaffIds(
    items.map((item) => item.staffId)
  )

  return items.map((item) => {
    const presence = presenceMap.get(item.staffId)
    return {
      ...item,
      evidencePhotoUploaded: presence?.photoUploaded ?? false,
      evidenceIdUploaded: presence?.idCardUploaded ?? false,
    }
  })
}

async function staffLoginIdForRowId(db: StaffDb, staffRowId: string): Promise<string> {
  const staff = await db.staff.findUnique({
    where: { id: staffRowId },
    select: { staffId: true, deleted: true },
  })
  if (!staff) {
    throw new MasterDomainError("Staff not found", "STAFF_NOT_FOUND", 404)
  }
  return staff.staffId
}

export async function getMasterStaffEvidenceDetail(db: StaffDb, staffRowId: string) {
  const staffId = await staffLoginIdForRowId(db, staffRowId)
  return getStaffEvidenceDetail(db, staffId)
}

export async function deleteMasterStaffEvidence(db: StaffDb, staffRowId: string) {
  const staffId = await staffLoginIdForRowId(db, staffRowId)
  await deleteStaffEvidence(db, staffId)
  return getStaffEvidenceDetail(db, staffId)
}

export async function submitMasterStaffEvidence(
  db: StaffDb,
  staffRowId: string,
  input: {
    photoBuffer: Buffer
    idCardBuffer: Buffer
    contentType?: string
  }
) {
  const staffId = await staffLoginIdForRowId(db, staffRowId)
  return replaceStaffEvidence(db, {
    staffId,
    photoBuffer: input.photoBuffer,
    idCardBuffer: input.idCardBuffer,
    contentType: input.contentType,
  })
}

export async function mintMasterStaffEvidenceMobileLink(
  db: StaffDb,
  staffRowId: string,
  input: { kind: StaffEvidenceFileKind; requestUrl: string }
) {
  const staffId = await staffLoginIdForRowId(db, staffRowId)
  const minted = mintStaffEvidenceCaptureToken({ staffId, kind: input.kind })
  return {
    uploadUrl: buildStaffEvidenceMobileUploadUrl(input.requestUrl, minted.token),
    token: minted.token,
    expiresAt: minted.expiresAt,
    kind: input.kind,
    staffId,
  }
}

export async function getMasterStaffEvidenceMobileStatus(
  db: StaffDb,
  staffRowId: string,
  token: string
) {
  const staffId = await staffLoginIdForRowId(db, staffRowId)
  const claims = verifyStaffEvidenceCaptureToken(token)
  if (claims.staffId !== staffId) {
    throw new MasterDomainError("Forbidden", "FORBIDDEN", 403)
  }
  return getStaffEvidenceCaptureUploadStatus(token)
}
