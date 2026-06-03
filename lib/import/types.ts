import type { BranchType, ProductType, Role } from "@/generated/prisma/client"

export type ImportMode = "dry-run" | "apply"

export type BranchImportRow = {
  code: string
  name: string
  type: BranchType
  isActive: boolean
  deleted: boolean
}

export type ProductImportRow = {
  code: string
  groupCode: number
  typeCode: number
  runningCode: number
  name: string
  productType: ProductType
  deleted: boolean
}

export type ReferenceStockImportRow = {
  hookGroup: string
  hookNo: number
  supplierCode: string
  productCode: string
  productGroup: string | null
  sourceFile: string
}

export type ImportPhaseName =
  | "branch"
  | "ho-manifest"
  | "product"
  | "reference-stock"
  | "staff"
  | "bootstrap-branches"

export type ImportEntity = "branch" | "product" | "reference-stock" | "staff"

export type StaffImportRow = {
  staffId: string
  name: string
  role: "HO_ADMIN" | "SH_STAFF"
  branchCode: string
  deleted: boolean
}

export type ImportPhaseReport = {
  phase: ImportPhaseName
  rowsRead: number
  wouldInsert: number
  wouldUpdate: number
  skipped: number
  inserted: number
  updated: number
  errors: string[]
  warnings: string[]
  missingProductReferences: string[]
  sampleRows: unknown[]
}

export type ImportReportTotals = {
  rowsRead: number
  wouldInsert: number
  wouldUpdate: number
  skipped: number
  inserted: number
  updated: number
  errors: number
  warnings: number
  missingProductReferences: number
}

export type ImportReportMeta = {
  entity: ImportEntity
  reportId: string
  archiveRoot: string
  sourceChecksums: Record<string, string>
}

export type ImportReport = {
  profile: string
  mode: ImportMode
  sourceDir: string
  startedAt: string
  completedAt: string
  phases: ImportPhaseReport[]
  totals: ImportReportTotals
  meta?: ImportReportMeta
}

export type ImportRunOptions = {
  profile: string
  apply: boolean
  sourceDir?: string
  entity?: ImportEntity
}

export type ImportProfile = {
  id: string
  sourceDir: string
  branchFile: string
  productFile: string
  staffFile: string
  referenceStockFiles: Array<{ fileName: string; hookGroup: string; optional?: boolean }>
  hoBranch: {
    code: string
    name: string
    type: BranchType
  }
  bootstrapShopBranch: {
    code: string
    name: string
    type: BranchType
  }
}

export type ImportDb = {
  branch: {
    findUnique: (args: {
      where: { code: string }
      select?: { id: true; name?: true; type?: true; isActive?: true; deleted?: true }
    }) => Promise<{
      id: string
      name?: string
      type?: BranchType
      isActive?: boolean
      deleted?: boolean
    } | null>
    upsert: (args: {
      where: { code: string }
      create: BranchImportRow
      update: Partial<BranchImportRow>
    }) => Promise<{ id: string }>
  }
  product: {
    findUnique: (args: {
      where: { code: string }
      select?: {
        id?: true
        name?: true
        groupCode?: true
        typeCode?: true
        runningCode?: true
        productType?: true
        deleted?: true
      }
    }) => Promise<{
      id: string
      name?: string
      groupCode?: number
      typeCode?: number
      runningCode?: number
      productType?: ProductType
      deleted?: boolean
    } | null>
    upsert: (args: {
      where: { code: string }
      create: ProductImportRow
      update: Partial<ProductImportRow>
    }) => Promise<{ id: string }>
  }
  referenceStock: {
    findUnique: (args: {
      where: {
        productId_hookGroup_hookNo: {
          productId: string
          hookGroup: string
          hookNo: number
        }
      }
      select?: {
        id?: true
        supplierCode?: true
        productCode?: true
        productGroup?: true
        deleted?: true
      }
    }) => Promise<{
      id: string
      supplierCode?: string
      productCode?: string
      productGroup?: string | null
      deleted?: boolean
    } | null>
    upsert: (args: {
      where: {
        productId_hookGroup_hookNo: {
          productId: string
          hookGroup: string
          hookNo: number
        }
      }
      create: {
        hookGroup: string
        hookNo: number
        supplierCode: string
        productCode: string
        productGroup: string | null
        productId: string
        deleted: boolean
      }
      update: {
        supplierCode: string
        productCode: string
        productGroup: string | null
        deleted: boolean
      }
    }) => Promise<{ id: string }>
  }
  staff: {
    findUnique: (args: {
      where: { staffId: string }
      select?: { id?: true; name?: true; role?: true; branchId?: true; deleted?: true }
    }) => Promise<{
      id: string
      name?: string
      role?: Role
      branchId?: string
      deleted?: boolean
    } | null>
    upsert: (args: {
      where: { staffId: string }
      create: {
        staffId: string
        name: string
        role: Role
        branchId: string
        password: string
        deleted: boolean
      }
      update: {
        name: string
        role: Role
        branchId: string
        password?: string
        deleted: boolean
      }
    }) => Promise<{ id: string }>
  }
}
