import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import {
  deleteStaffEvidence,
  getStaffEvidenceDetail,
  resolveStaffEvidencePresenceForStaffIds,
} from "@/lib/pos/staff-evidence"
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

async function staffLoginIdForRowId(db: StaffDb, rowId: string): Promise<string> {
  const staff = await db.staff.findUnique({
    where: { id: rowId },
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
  return deleteStaffEvidence(db, staffId)
}
