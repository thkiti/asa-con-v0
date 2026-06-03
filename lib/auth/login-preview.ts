export const LOGIN_PREVIEW_NOT_FOUND_MESSAGE = "ไม่พบข้อมูล"

export class LoginPreviewError extends Error {
  readonly code = "NOT_FOUND"
  readonly httpStatus = 404

  constructor(message: string = LOGIN_PREVIEW_NOT_FOUND_MESSAGE) {
    super(message)
    this.name = "LoginPreviewError"
  }
}

export type StaffPreview = {
  staffId: string
  staffName: string
  branchId: string
  branchCode: string
  branchName: string
}

export type BranchPreview = {
  branchId: string
  branchCode: string
  branchName: string
}

function rejectNotFound(): never {
  throw new LoginPreviewError()
}

export { rejectNotFound as rejectLoginPreviewNotFound }
