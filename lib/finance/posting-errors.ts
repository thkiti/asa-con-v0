export class FinancePostingError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "FinancePostingError"
    this.code = code
  }
}