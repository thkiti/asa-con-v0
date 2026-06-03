import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth"
import { toSessionUserApi } from "@/lib/auth/session-user-api"

/** GET /api/auth/session — returns credential session user or 401. */
export async function GET() {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user: toSessionUserApi(user) })
}
