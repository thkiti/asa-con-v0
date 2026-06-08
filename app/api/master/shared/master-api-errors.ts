import { MasterDomainError } from "@/lib/master/errors"
import { PricingDomainError } from "@/lib/pricing/pricing-errors"
import { MasterDatabaseAuthError } from "@/lib/permissions/master"
import { ReceiptSettingsError } from "@/lib/receipt-settings/errors"
import { ThermalLayoutError } from "@/lib/thermal-layout/errors"
import { NextResponse } from "next/server"

export function masterErrorResponse(err: unknown, logLabel: string): NextResponse {
  console.error(logLabel, err)

  if (err instanceof ThermalLayoutError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof ReceiptSettingsError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof PricingDomainError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof MasterDatabaseAuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  if (err instanceof MasterDomainError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.httpStatus }
    )
  }

  return NextResponse.json(
    {
      error: err instanceof Error ? err.message : "Master Database request failed",
      code: "MASTER_ERROR",
    },
    { status: 500 }
  )
}
