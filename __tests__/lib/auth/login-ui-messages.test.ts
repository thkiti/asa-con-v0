import { mapLoginErrorCode } from "@/lib/auth/login-ui-messages"

describe("mapLoginErrorCode", () => {
  it("maps INVALID_CREDENTIALS", () => {
    expect(mapLoginErrorCode("INVALID_CREDENTIALS")).toBe(
      "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง"
    )
  })

  it("maps USERNAME_REQUIRED", () => {
    expect(mapLoginErrorCode("USERNAME_REQUIRED")).toBe("กรุณากรอกรหัสพนักงาน")
  })

  it("maps PASSWORD_REQUIRED", () => {
    expect(mapLoginErrorCode("PASSWORD_REQUIRED")).toBe("กรุณากรอกรหัสผ่าน")
  })

  it("maps BRANCH_INACTIVE", () => {
    expect(mapLoginErrorCode("BRANCH_INACTIVE")).toBe("สาขานี้ไม่สามารถใช้งานได้")
  })

  it("maps DEV_STAFF_NOT_ALLOWED", () => {
    expect(mapLoginErrorCode("DEV_STAFF_NOT_ALLOWED")).toBe("ไม่อนุญาตให้ใช้บัญชีนี้")
  })

  it("maps NOT_FOUND", () => {
    expect(mapLoginErrorCode("NOT_FOUND")).toBe("ไม่พบข้อมูล")
  })

  it("maps BRANCH_MISMATCH", () => {
    expect(mapLoginErrorCode("BRANCH_MISMATCH")).toBe("พนักงานไม่สังกัดสาขานี้")
  })

  it("uses fallback message for unknown codes", () => {
    expect(mapLoginErrorCode("OTHER", "Server error")).toBe("Server error")
  })
})
