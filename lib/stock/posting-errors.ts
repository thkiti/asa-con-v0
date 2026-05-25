export class PostingError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = "PostingError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function assertPostingRequiredString(
  value: unknown,
  field: string
): string {
  const s = String(value ?? "").trim()
  if (!s) {
    throw new PostingError(
      `postDocument: ${field} is required`,
      "MISSING_FIELD",
      400
    )
  }
  return s
}