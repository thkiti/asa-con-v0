export function mapLoginErrorCode(
  code: string | undefined,
  fallbackMessage?: string
): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง"
    case "USERNAME_REQUIRED":
      return "กรุณากรอกรหัสพนักงาน"
    case "PASSWORD_REQUIRED":
      return "กรุณากรอกรหัสผ่าน"
    case "BRANCH_INACTIVE":
      return "สาขานี้ไม่สามารถใช้งานได้"
    case "DEV_STAFF_NOT_ALLOWED":
      return "ไม่อนุญาตให้ใช้บัญชีนี้"
    default:
      return fallbackMessage?.trim() || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง"
  }
}
