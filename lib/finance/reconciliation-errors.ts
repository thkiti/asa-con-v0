export class ReconciliationError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "ReconciliationError"
    this.code = code
  }
}
