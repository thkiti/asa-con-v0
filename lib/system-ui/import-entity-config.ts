import type { ImportEntityKey } from "./import-types"

export const SYSTEM_IMPORT_DESCRIPTION =
  "หน้าจอนี้ใช้สำหรับเตรียมข้อมูลเริ่มต้นของระบบหรือกู้คืนข้อมูลหลัก ไม่ใช่งานประจำวัน"

export type ImportEntityConfig = {
  key: ImportEntityKey
  title: string
  purpose: string
  sourceFiles: string[]
  archiveRoles: string[]
  bootstrapNote?: string
}

export const IMPORT_ENTITY_CONFIGS: ImportEntityConfig[] = [
  {
    key: "branch",
    title: "Branch Import",
    purpose:
      "นำเข้าข้อมูลสาขาจาก SHP.DBF และสร้างสำนักงานใหญ่ HO999 ตามโปรไฟล์ devboard-v1",
    sourceFiles: ["dbf/SHP.DBF"],
    archiveRoles: ["branch", "other"],
  },
  {
    key: "product",
    title: "Product Import",
    purpose: "นำเข้ารหัสสินค้า 7 หลักจาก POSINY.DBF เป็น Product แบบ TRACKED",
    sourceFiles: ["dbf/POSINY.DBF"],
    archiveRoles: ["product"],
  },
  {
    key: "reference-stock",
    title: "ReferenceStock Import",
    purpose:
      "นำเข้าไฟล์ kCode/cCode/mCode (และ oCode ถ้ามี) เพื่อเชื่อม ReferenceStock กับ Product",
    sourceFiles: ["csv/kCode.csv", "csv/cCode.csv", "csv/mCode.csv", "csv/oCode.csv (ถ้ามี)"],
    archiveRoles: ["reference-stock", "optional-reference-stock"],
  },
  {
    key: "staff",
    title: "Staff Import",
    purpose:
      "นำเข้าพนักงานจาก EME.DBF ด้วยกฎ bootstrap ที่กำหนดไว้ — ต้องมีสาขา HO999 และ SH999 ก่อน (SH999 = สาขาพัก/บัฟเฟอร์โอนสินค้า)",
    sourceFiles: ["dbf/EME.DBF"],
    archiveRoles: ["staff"],
    bootstrapNote:
      "staffId 001 → สำนักงานใหญ่ HO999 · staffId 001 → ผู้ดูแลระบบ · พนักงานอื่น → สาขา SH999 (พัก/โอน) · พนักงานอื่น → พนักงานสาขา",
  },
]

export function getImportEntityConfig(key: ImportEntityKey): ImportEntityConfig {
  const config = IMPORT_ENTITY_CONFIGS.find((item) => item.key === key)
  if (!config) throw new Error(`Unknown import entity: ${key}`)
  return config
}

export const APPLY_CONFIRM_MESSAGE =
  "ยืนยัน Apply — ระบบจะ upsert ข้อมูลเท่านั้น ไม่มีการ reset หรือลบข้อมูลทั้งหมด"

export const APPLY_CONFIRM_DETAIL =
  "ตรวจสอบ Report จาก Dry Run แล้ว หากแหล่งข้อมูลไม่เปลี่ยน ให้กดยืนยันเพื่อบันทึก"

export const STAFF_IMPORT_LOGIN_NOTE =
  "หลังจากนำเข้าข้อมูลพนักงานแล้ว สามารถเข้าสู่ระบบด้วยรหัสพนักงานที่นำเข้าได้"

export const STAFF_IMPORT_NO_STAFF_WARNING = "ยังไม่มีข้อมูลพนักงานในระบบ"
