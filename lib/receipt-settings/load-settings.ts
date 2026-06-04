import type { PrismaClient } from "@/generated/prisma/client"
import { RECEIPT_PRINT_SETTINGS_ID } from "./constants"
import { toReceiptPrintSettingsView } from "./mapper"
import type { ReceiptPrintSettingsView } from "./types"

type SettingsDb = Pick<PrismaClient, "receiptPrintSettings">

export async function loadReceiptPrintSettings(
  db: SettingsDb
): Promise<ReceiptPrintSettingsView> {
  const row = await db.receiptPrintSettings.findUnique({
    where: { id: RECEIPT_PRINT_SETTINGS_ID },
  })
  return toReceiptPrintSettingsView(row)
}
