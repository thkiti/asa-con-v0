import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { authErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { bootstrapLogin } from "@/lib/auth/bootstrap-login"
import { setSessionCookies } from "@/lib/auth/session-cookies"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await bootstrapLogin({
      staffId: String(body.staffId ?? ""),
      returnTo: body.returnTo,
    })

    setSessionCookies(await cookies(), result.sessionUser)

    return NextResponse.json({
      redirectTo: result.redirectTo,
      staff: result.staff,
    })
  } catch (err) {
    return authErrorResponse(err, "POST /api/auth/login")
  }
}
