import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { authErrorResponse } from "@/app/api/system/import/shared/import-api-errors"
import { previewBranchByCode } from "@/lib/auth/branch-preview"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const preview = await previewBranchByCode(String(body.branchCode ?? ""))
    return NextResponse.json(preview)
  } catch (err) {
    return authErrorResponse(err, "POST /api/auth/branch-preview")
  }
}
