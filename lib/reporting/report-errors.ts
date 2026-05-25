export class ReportError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "ReportError"
    this.code = code
  }
}

export class InvalidDateRangeError extends ReportError {
  constructor(message = "Invalid date range") {
    super(message, "INVALID_DATE_RANGE")
    this.name = "InvalidDateRangeError"
  }
}

export class EmptyFilterError extends ReportError {
  constructor(message = "Report filter is empty or invalid") {
    super(message, "EMPTY_FILTER")
    this.name = "EmptyFilterError"
  }
}
