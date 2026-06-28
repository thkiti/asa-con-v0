import type { Prisma } from "@/generated/prisma/client"

/**
 * Read-report / collector ticket queries only need gross totals and line items.
 * Explicit select avoids requiring P1.25 VAT snapshot columns on databases not yet migrated.
 */
export const saleReadReportSelect = {
  id: true,
  total: true,
  createdAt: true,
  staffId: true,
  items: true,
  payment: true,
} satisfies Prisma.SaleSelect

export type SaleForReadReport = Prisma.SaleGetPayload<{
  select: typeof saleReadReportSelect
}>
