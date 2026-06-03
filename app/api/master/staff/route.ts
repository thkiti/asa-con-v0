import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  createStaff,
  listStaff,
  parseCreateStaffBody,
  parseStaffListQuery,
} from "@/lib/master"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const query = parseStaffListQuery(req.nextUrl.searchParams)
    const items = await listStaff(prisma, query)
    return NextResponse.json({ items })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/staff")
  }
}

export async function POST(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const body = parseCreateStaffBody(await req.json())
    const item = await createStaff(prisma, body)
    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    return masterErrorResponse(err, "POST /api/master/staff")
  }
}
