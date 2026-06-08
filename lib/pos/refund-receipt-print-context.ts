import type { PrismaClient, RefundKind } from "@/generated/prisma/client"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/receipt-settings/constants"
import { loadCompanyTaxId } from "@/lib/receipt-settings/resolve-company-tax"
import { loadReceiptPrintSettings } from "@/lib/receipt-settings/load-settings"
import type { ReceiptPrintSettingsView } from "@/lib/receipt-settings/types"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { loadThermalLayouts } from "@/lib/thermal/load-layouts"
import type { ResolvedThermalLayout, ThermalLayoutMap } from "@/lib/thermal/types"
import { loadRefundReceiptForPrint } from "./load-refund-receipt"

export type RefundReceiptPrintContext = {
  refundId: string
  refundNo: string
  issuedAt: string
  kind: RefundKind
  amount: string
  reason: string | null
  branchId: string
  branchCode: string
  branchName: string
  branchAddress: string | null
  branchPhone: string | null
  companyDisplayName: string | null
  companyTaxId: string | null
  machineTaxId: string | null
  cashierDisplay: string | null
  saleId: string | null
  originalReceiptId: string | null
  originalReceiptNo: string | null
  settings: ReceiptPrintSettingsView
  thermalLayouts?: ThermalLayoutMap
  thermalLayout?: ResolvedThermalLayout
}

export type RefundReceiptPrintDb = Pick<
  PrismaClient,
  "refund" | "staff" | "branch" | "receiptPrintSettings" | "thermalDocumentLayout"
>

export async function loadRefundReceiptPrintContext(
  db: RefundReceiptPrintDb,
  input: { refundId: string; branchId: string }
): Promise<RefundReceiptPrintContext> {
  const refundView = await loadRefundReceiptForPrint(db, input)
  const [settings, companyTaxId, branchContact, thermalLayouts] = await Promise.all([
    loadReceiptPrintSettings(db),
    loadCompanyTaxId(db),
    db.branch.findUnique({
      where: { id: input.branchId },
      select: { code: true, address: true, phone: true, taxId: true },
    }),
    loadThermalLayouts(db),
  ])

  const branchCode = branchContact?.code?.trim() || refundView.branchCode
  const machineRaw = branchContact?.taxId?.trim() || null
  const machineTaxId =
    branchCode === COMPANY_TAX_BRANCH_CODE ? null : machineRaw

  return {
    refundId: refundView.refundId,
    refundNo: refundView.refundNo,
    issuedAt: refundView.issuedAt,
    kind: refundView.kind,
    amount: refundView.amount,
    reason: refundView.reason,
    branchId: refundView.branchId,
    branchCode: refundView.branchCode,
    branchName: refundView.branchName,
    branchAddress: branchContact?.address?.trim() || null,
    branchPhone: branchContact?.phone?.trim() || null,
    companyDisplayName: settings.companyDisplayName,
    companyTaxId,
    machineTaxId,
    cashierDisplay: refundView.cashierDisplay,
    saleId: refundView.saleId,
    originalReceiptId: refundView.originalReceiptId,
    originalReceiptNo: refundView.originalReceiptNo,
    settings,
    thermalLayouts,
    thermalLayout: resolveThermalLayout("REFUND", thermalLayouts),
  }
}
