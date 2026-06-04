import type { BranchListItem } from "./types"

export function toBranchListItem(row: {
  id: string
  code: string
  name: string
  type: BranchListItem["type"]
  address?: string | null
  phone?: string | null
  taxId?: string | null
  isActive: boolean
  deleted: boolean
}): BranchListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    address: row.address?.trim() || null,
    phone: row.phone?.trim() || null,
    taxId: row.taxId?.trim() || null,
    isActive: row.isActive,
    deleted: row.deleted,
  }
}
