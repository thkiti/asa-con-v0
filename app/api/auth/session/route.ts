import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth"

/** GET /api/auth/session — stub; returns cookie-based SessionUser or 401. */
export async function GET() {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user })
}