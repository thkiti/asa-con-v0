import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { clearSessionCookies } from "@/lib/auth/session-cookies"
import { cookies } from "next/headers"

export async function POST() {
  clearSessionCookies(await cookies())
  return NextResponse.json({ redirectTo: "/login" })
}
