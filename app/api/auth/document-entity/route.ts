import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { authErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { getSession } from "@/lib/auth"
import { setSessionCookies } from "@/lib/auth/session-cookies"
import { toSessionUserApi } from "@/lib/auth/session-user-api"
import {
  assertDocumentEntityChangeAllowed,
  DocumentEntityError,
} from "@/lib/legal-entity"
import { cookies } from "next/headers"

/** PATCH /api/auth/document-entity — HO999 finance/admin session entity toggle. */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
    }

    const body = await req.json()
    const documentEntityCode = assertDocumentEntityChangeAllowed({
      role: user.role,
      branchCode: user.branchCode,
      requested: body.documentEntityCode,
    })

    const updatedUser = { ...user, documentEntityCode }
    setSessionCookies(await cookies(), updatedUser)

    return NextResponse.json({ user: toSessionUserApi(updatedUser) })
  } catch (err) {
    if (err instanceof DocumentEntityError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return authErrorResponse(err, "PATCH /api/auth/document-entity")
  }
}
