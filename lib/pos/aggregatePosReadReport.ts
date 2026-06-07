import type { PaymentMethod, Product } from "@/generated/prisma/client"
import {
  READ_REPORT_PAYMENT_LABEL,
  READ_REPORT_PAYMENT_ORDER,
  readReportPaymentBucket,
} from "@/lib/pos/readReportPayment"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function pad3(n: number) {
  return String(n).padStart(3, "0")
}

interface GroupAgg {
  qty: number
  amount: number
  sampleName: string
}

export type SaleRowForReadReport = {
  total: unknown
  payment: { method: PaymentMethod } | null
  items: Array<{
    productId: string
    qty: unknown
    lineTotal: unknown
  }>
}

export type ReadReportGroupLine = {
  lineKey: string
  displayLeft: string
  qty: number
  amount: number
}

export type ReadReportPaymentLine = {
  key: string
  label: string
  amount: number
}

/** รวมตามกลุ่มสินค้า + ช่องทางชำระ — logic เดียวกับ READ X/Z */
export function aggregatePosReadReportFromSales(
  sales: SaleRowForReadReport[],
  products: Pick<
    Product,
    "id" | "name" | "groupCode" | "typeCode" | "runningCode" | "code"
  >[]
): {
  groupLines: ReadReportGroupLine[]
  paymentLines: ReadReportPaymentLine[]
  grandTotal: number
  saleCount: number
} {
  const productById = new Map(products.map((p) => [p.id, p]))
  const groupMap = new Map<number, GroupAgg>()

  for (const sale of sales) {
    for (const line of sale.items) {
      const pid = line.productId
      const p = productById.get(pid)
      if (!p) continue
      const g = p.groupCode
      const cur = groupMap.get(g) ?? {
        qty: 0,
        amount: 0,
        sampleName: p.name,
      }
      cur.qty += Number(line.qty)
      cur.amount += Number(line.lineTotal)
      if (p.name.length > cur.sampleName.length) cur.sampleName = p.name
      groupMap.set(g, cur)
    }
  }

  const groupLines = [...groupMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([g, v]) => {
      const inGroup = products.filter((p) => p.groupCode === g)
      const p0 =
        inGroup.sort((a, b) => a.code.localeCompare(b.code))[0] ?? null
      const code7 = p0
        ? `${pad2(p0.groupCode)}${pad2(p0.typeCode)}${pad3(p0.runningCode)}`
        : `${pad2(g)}00000`
      const nameShort =
        v.sampleName.length > 22
          ? `${v.sampleName.slice(0, 20)}…`
          : v.sampleName
      return {
        lineKey: String(g),
        displayLeft: `${code7}-${nameShort}`,
        qty: v.qty,
        amount: Math.round(v.amount * 100) / 100,
      }
    })

  const paymentTotals: Record<string, number> = {}
  for (const k of READ_REPORT_PAYMENT_ORDER) paymentTotals[k] = 0

  let grandTotal = 0
  for (const sale of sales) {
    const t = Number(sale.total)
    grandTotal += t
    const method = sale.payment?.method ?? "CASH"
    const bucket = readReportPaymentBucket(method)
    paymentTotals[bucket] = (paymentTotals[bucket] ?? 0) + t
  }
  grandTotal = Math.round(grandTotal * 100) / 100

  const paymentLines = READ_REPORT_PAYMENT_ORDER.map((key) => ({
    key,
    label: READ_REPORT_PAYMENT_LABEL[key],
    amount: Math.round((paymentTotals[key] ?? 0) * 100) / 100,
  }))

  return {
    groupLines,
    paymentLines,
    grandTotal,
    saleCount: sales.length,
  }
}
