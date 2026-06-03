import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { authErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { credentialLogin } from "@/lib/auth/credential-login"
import { setSessionCookies } from "@/lib/auth/session-cookies"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await credentialLogin({
      username: String(body.username ?? ""),
      password: String(body.password ?? ""),
      returnTo: body.returnTo,
    })

    setSessionCookies(await cookies(), result.sessionUser)

    return NextResponse.json({
      redirectTo: result.redirectTo,
      user: toSessionUserApi(result.sessionUser),
    })
  } catch (err) {
    return authErrorResponse(err, "POST /api/auth/login")
  }
}
