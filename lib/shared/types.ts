/**
 * Kernel enums — re-exported from Prisma client.
 * Do not duplicate these as manual string unions.
 */
export {
  Role,
  BranchType,
  ProductType,
  DocType,
  DocStatus,
} from "@/generated/prisma/client"

/** Accounting period key (YYYYMM). */
export type PeriodMonth = string

/** Classifier stored on StockTransaction.refType / StockLayer.refType. */
export type StockRefType = string