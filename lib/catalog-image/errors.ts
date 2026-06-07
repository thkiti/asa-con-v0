import { NextResponse } from "next/server"

export class CatalogImageError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "CatalogImageError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function catalogImageErrorResponse(
  err: unknown,
  logLabel: string
): NextResponse {
  if (err instanceof CatalogImageError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  const message = err instanceof Error ? err.message : "Internal server error"
  console.error(`${logLabel}:`, err)
  return NextResponse.json({ error: message }, { status: 500 })
}
