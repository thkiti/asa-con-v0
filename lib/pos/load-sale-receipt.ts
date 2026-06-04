import { SaleStatus, type PrismaClient } from "@/generated/prisma/client"
import { cleanGroupDisplayName } from "@/lib/master/build-product-group"
import { formatCashierDisplay } from "./format-cashier-display"
import { PosLookupError } from "./pos-errors"

export type SaleReceiptLine = {
  code: string
  name: string
  qty: number
  unitPrice: string
  lineTotal: string
}

export type SaleReceiptView = {
  saleId: string
  receiptNo: string
  issuedAt: string
  branchCode: string
  branchName: string
  cashierDisplay: string | null
  lines: SaleReceiptLine[]
  total: string
  paymentMethod: string
  cashAmount: string
  change: string
}

export type SaleReceiptDb = Pick<PrismaClient, "sale" | "staff">

export async function loadSaleReceiptForPrint(
  db: SaleReceiptDb,
  input: { saleId: string; branchId: string }
): Promise<SaleReceiptView> {
  const saleId = String(input.saleId ?? "").trim()
  const branchId = String(input.branchId ?? "").trim()
  if (!saleId) {
    throw new PosLookupError("Sale id is required", "INVALID_SALE_ID", 400)
  }
  if (!branchId) {
    throw new PosLookupError("Branch is required", "INVALID_BRANCH", 400)
  }

  const sale = await db.sale.findFirst({
    where: {
      id: saleId,
      branchId,
      status: SaleStatus.COMPLETED,
    },
    include: {
      branch: { select: { code: true, name: true } },
      items: {
        include: {
          product: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      payment: true,
      receipt: true,
    },
  })

  if (!sale || !sale.payment || !sale.receipt) {
    throw new PosLookupError("Sale receipt not found", "SALE_NOT_FOUND", 404)
  }

  let staffName: string | null = null
  if (sale.staffId?.trim()) {
    const staff = await db.staff.findUnique({
      where: { staffId: sale.staffId.trim() },
      select: { name: true },
    })
    staffName = staff?.name ?? null
  }

  return {
    saleId: sale.id,
    receiptNo: sale.receipt.receiptNo,
    issuedAt: sale.receipt.issuedAt.toISOString(),
    branchCode: sale.branch.code,
    branchName: sale.branch.name,
    cashierDisplay: formatCashierDisplay(sale.staffId, staffName),
    lines: sale.items.map((item) => ({
      code: item.product.code,
      name: cleanGroupDisplayName(item.product.name),
      qty: item.qty,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    })),
    total: sale.total.toFixed(2),
    paymentMethod: sale.payment.method,
    cashAmount: sale.payment.amount.toFixed(2),
    change: sale.payment.change.toFixed(2),
  }
}
