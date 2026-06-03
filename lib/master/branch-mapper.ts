import type { BranchListItem } from "./types"

export function toBranchListItem(row: {
  id: string
  code: string
  name: string
  type: BranchListItem["type"]
  isActive: boolean
  deleted: boolean
}): BranchListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    isActive: row.isActive,
    deleted: row.deleted,
  }
}
