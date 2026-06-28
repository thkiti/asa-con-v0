export const PosSettlementErrorCodes = {
  COLLECTOR_REPORT_NOT_FOUND: "COLLECTOR_REPORT_NOT_FOUND",
  INVALID_SOURCE: "INVALID_SOURCE",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  DUPLICATE_SOURCE: "DUPLICATE_SOURCE",
  FORBIDDEN_LEGAL_ENTITY: "FORBIDDEN_LEGAL_ENTITY",
} as const

export type PosSettlementErrorCode =
  (typeof PosSettlementErrorCodes)[keyof typeof PosSettlementErrorCodes]

export class PosSettlementError extends Error {
  readonly code: PosSettlementErrorCode
  readonly status: number

  constructor(
    message: string,
    code: PosSettlementErrorCode,
    status = 400
  ) {
    super(message)
    this.name = "PosSettlementError"
    this.code = code
    this.status = status
  }
}
