import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { authErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { previewStaffByStaffId } from "@/lib/auth/staff-preview"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const preview = await previewStaffByStaffId(String(body.staffId ?? ""))
    return NextResponse.json(preview)
  } catch (err) {
    return authErrorResponse(err, "POST /api/auth/staff-preview")
  }
}
