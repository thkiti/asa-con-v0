export type VoucherReadErrorCode = "NOT_FOUND"

export class VoucherReadError extends Error {
  readonly code: VoucherReadErrorCode

  constructor(message: string, code: VoucherReadErrorCode) {
    super(message)
    this.name = "VoucherReadError"
    this.code = code
  }
}
