import type { PrismaClient, Staff } from "@/generated/prisma/client"

/**
 * ค้นหาพนักงานตามรหัสที่พิมพ์ใน READ X/Z / Collect / resolve-staff
 */
export async function resolveStaffForPosReadReport(
  prisma: PrismaClient,
  opts: { staffCode: string }
): Promise<Staff | null> {
  return prisma.staff.findFirst({
    where: { staffId: opts.staffCode, deleted: false },
  })
}
