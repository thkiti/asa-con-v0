import type { DocType } from "@/generated/prisma/client"

/** Shop-facing document types (Phase 23D lock). */
export const SHOP_STOCK_DOC_TYPES: readonly DocType[] = [
  "TRANSFER_OUT",
  "PERFORMANCE",
  "ADJUSTMENT",
] as const

export const SHOP_STOCK_DOC_TYPE_LABELS = {
  TRANSFER_OUT: "Transfer out",
  PERFORMANCE: "Performance",
  ADJUSTMENT: "Adjustment",
} as const

export const DEFAULT_LIST_PAGE_SIZE = 50
