import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

const SHOP_RECEIPT_PATH = "/shop/receipt"
const SHOP_REFUND_RECEIPT_PATH = "/shop/refund-receipt"

export type PosOriginShopPathInput = {
  refType: string
  refId: string
  branchId?: string
  autoprint?: boolean
}

function appendPosOriginShopQuery(
  basePath: string,
  input: Pick<PosOriginShopPathInput, "branchId" | "autoprint">
): string {
  const params = new URLSearchParams()
  const branchId = input.branchId?.trim()
  if (branchId) params.set("branchId", branchId)
  if (input.autoprint) params.set("autoprint", "1")
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function buildPosOriginShopBasePath(input: {
  refType: string
  refId: string
}): string | null {
  const id = input.refId.trim()
  if (!id) return null

  if (input.refType === FINANCE_REF_TYPES.POS_SALE) {
    return `${SHOP_RECEIPT_PATH}/${encodeURIComponent(id)}`
  }

  if (input.refType === FINANCE_REF_TYPES.POS_REFUND) {
    return `${SHOP_REFUND_RECEIPT_PATH}/${encodeURIComponent(id)}`
  }

  return null
}

export function buildPosOriginShopPath(input: PosOriginShopPathInput): string | null {
  const base = buildPosOriginShopBasePath(input)
  if (!base) return null
  return appendPosOriginShopQuery(base, input)
}
