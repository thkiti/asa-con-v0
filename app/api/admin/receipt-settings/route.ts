import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  loadReceiptPrintSettings,
  parseUpdateReceiptPrintSettingsBody,
  updateReceiptPrintSettings,
} from "@/lib/receipt-settings"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  try {
    requireMasterDatabaseSession(await getSession())
    const settings = await loadReceiptPrintSettings(prisma)
    return NextResponse.json({ settings })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/admin/receipt-settings")
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const body = parseUpdateReceiptPrintSettingsBody(await req.json())
    const settings = await updateReceiptPrintSettings(prisma, body)
    return NextResponse.json({ settings })
  } catch (err: unknown) {
    return masterErrorResponse(err, "PATCH /api/admin/receipt-settings")
  }
}
