import type { PrismaClient } from "@/generated/prisma/client"
import { verifyStaffPassword } from "@/lib/auth/verify-staff-password"
import { resolveStaffForPosReadReport } from "@/lib/pos/resolvePosReportStaff"

export type PosReportStaffIntent = "READ" | "COLLECT" | "READ_Z_REVIEW"

export type VerifiedPosReportStaff = {
  staffId: string
  name: string
  id: string
}

/**
 * ยืนยันรหัสพนักงาน + รหัสผ่านสำหรับ READ X/Z / COLLECT บน POS
 * COLLECT ต้องเป็นพนักงาน HO (role !== SH_STAFF) — ยืนยันที่ gate ไม่ใช่ session POS
 */
export async function verifyPosReportStaffCredentials(
  prisma: PrismaClient,
  opts: {
    staffCode: string
    password: string
    intent: PosReportStaffIntent
  }
): Promise<
  | { ok: true; staff: VerifiedPosReportStaff }
  | { ok: false; code: "bad_credentials" | "no_collect_permission" | "no_ho_permission" }
> {
  const code = opts.staffCode.trim()
  const password = opts.password
  if (!code || !password) {
    return { ok: false, code: "bad_credentials" }
  }

  const staff = await resolveStaffForPosReadReport(prisma, { staffCode: code })
  if (!staff) return { ok: false, code: "bad_credentials" }

  if (!staff.password) return { ok: false, code: "bad_credentials" }

  const valid = await verifyStaffPassword(password, staff.password)
  if (!valid) return { ok: false, code: "bad_credentials" }

  if (opts.intent === "COLLECT" && staff.role === "SH_STAFF") {
    return { ok: false, code: "no_collect_permission" }
  }

  return {
    ok: true,
    staff: {
      staffId: staff.staffId,
      name: staff.name ?? "",
      id: staff.id,
    },
  }
}
