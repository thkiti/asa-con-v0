import type { PrismaClient } from "@/generated/prisma/client"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/receipt-settings/constants"
import { loadCompanyTaxId } from "@/lib/receipt-settings/resolve-company-tax"
import { loadReceiptPrintSettings } from "@/lib/receipt-settings/load-settings"
import type { ReceiptPrintSettingsView } from "@/lib/receipt-settings/types"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { loadThermalLayouts } from "@/lib/thermal/load-layouts"
import type { ResolvedThermalLayout, ThermalLayoutMap } from "@/lib/thermal/types"
import { loadSaleReceiptForPrint, type SaleReceiptLine } from "./load-sale-receipt"

export type ReceiptPrintContext = {
  saleId: string
  receiptNo: string
  issuedAt: string
  branchCode: string
  branchName: string
  branchAddress: string | null
  branchPhone: string | null
  companyDisplayName: string | null
  companyTaxId: string | null
  machineTaxId: string | null
  cashierDisplay: string | null
  lines: SaleReceiptLine[]
  total: string
  paymentMethod: string
  cashAmount: string
  change: string
  settings: ReceiptPrintSettingsView
  thermalLayouts?: ThermalLayoutMap
  thermalLayout?: ResolvedThermalLayout
}

export type ReceiptPrintDb = Pick<
  PrismaClient,
  "sale" | "staff" | "branch" | "receiptPrintSettings" | "thermalDocumentLayout"
>

export async function loadReceiptPrintContext(
  db: ReceiptPrintDb,
  input: { saleId: string; branchId: string }
): Promise<ReceiptPrintContext> {
  const saleView = await loadSaleReceiptForPrint(db, input)
  const [settings, companyTaxId, branchContact, thermalLayouts] = await Promise.all([
    loadReceiptPrintSettings(db),
    loadCompanyTaxId(db),
    db.branch.findUnique({
      where: { id: input.branchId },
      select: { code: true, address: true, phone: true, taxId: true },
    }),
    loadThermalLayouts(db),
  ])

  const branchCode = branchContact?.code?.trim() || saleView.branchCode
  const machineRaw = branchContact?.taxId?.trim() || null
  const machineTaxId =
    branchCode === COMPANY_TAX_BRANCH_CODE ? null : machineRaw

  return {
    saleId: saleView.saleId,
    receiptNo: saleView.receiptNo,
    issuedAt: saleView.issuedAt,
    branchCode: saleView.branchCode,
    branchName: saleView.branchName,
    branchAddress: branchContact?.address?.trim() || null,
    branchPhone: branchContact?.phone?.trim() || null,
    companyDisplayName: settings.companyDisplayName,
    companyTaxId,
    machineTaxId,
    cashierDisplay: saleView.cashierDisplay,
    lines: saleView.lines,
    total: saleView.total,
    paymentMethod: saleView.paymentMethod,
    cashAmount: saleView.cashAmount,
    change: saleView.change,
    settings,
    thermalLayouts,
    thermalLayout: resolveThermalLayout("RECEIPT", thermalLayouts),
  }
}
