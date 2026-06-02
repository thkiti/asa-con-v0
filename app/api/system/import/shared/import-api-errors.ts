import { ImportApplyGateError } from "@/lib/import/apply-gate"
import { assertImportApplyAllowed } from "@/lib/import/safety"
import { SystemImportAuthError } from "@/lib/auth/system-import"
import { BootstrapLoginError } from "@/lib/auth/bootstrap-login"
import { NextResponse } from "next/server"

export function importErrorResponse(err: unknown, logLabel: string): NextResponse {
  console.error(logLabel, err)

  if (err instanceof SystemImportAuthError || err instanceof ImportApplyGateError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof BootstrapLoginError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof Error && err.message.includes("Refusing import apply")) {
    return NextResponse.json(
      { error: err.message, code: "PRODUCTION_GUARD" },
      { status: 403 }
    )
  }

  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Import request failed", code: "IMPORT_ERROR" },
    { status: 500 }
  )
}

export function authErrorResponse(err: unknown, logLabel: string): NextResponse {
  return importErrorResponse(err, logLabel)
}
