import type { BranchType, ProductType, Role } from "@/lib/shared"

export type ListMode = "active" | "trash"

export type ReferenceStatusFilter = "all" | "has" | "none"

export type BranchListItem = {
  id: string
  code: string
  name: string
  type: BranchType
  isActive: boolean
  deleted: boolean
}

export type StaffListItem = {
  id: string
  staffId: string
  name: string
  role: Role
  deleted: boolean
  branchId: string
  branchCode: string
  branchName: string
}

export type ProductReferenceListItem = {
  rowId: string
  productId: string
  productCode: string
  productName: string
  productType: ProductType
  hookGroup: string
  hookNo: number | null
  supplierCode: string
  productGroup: string | null
  referenceProductCode: string
  hasReference: boolean
  deleted: boolean
}

export type BranchListQuery = {
  mode: ListMode
  q: string
}

export type StaffListQuery = {
  mode: ListMode
  q: string
  role: Role | null
  branchCode: string
}

export type ProductReferenceListQuery = {
  mode: ListMode
  productCode: string
  productName: string
  hookGroup: string
  hookNo: string
  supplierCode: string
  productGroup: string
  referenceStatus: ReferenceStatusFilter
}
