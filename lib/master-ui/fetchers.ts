import type {
  BranchListItem,
  BranchListQuery,
  ProductReferenceListItem,
  ProductReferenceListQuery,
  StaffListItem,
  StaffListQuery,
} from "@/lib/master/types"

type MasterListResponse<T> = { items: T[] }

async function throwMasterFetchError(res: Response): Promise<never> {
  let message = res.statusText || "Request failed"
  let code: string | undefined
  try {
    const body = (await res.json()) as { error?: string; code?: string }
    if (body.error) message = body.error
    code = body.code
  } catch {
    // keep statusText
  }
  const err = new Error(message) as Error & { code?: string }
  if (code) err.code = code
  throw err
}

function toSearchParams(
  entries: Record<string, string | undefined>
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(entries)) {
    const trimmed = String(value ?? "").trim()
    if (trimmed) params.set(key, trimmed)
  }
  return params
}

export type CreateMasterBranchInput = {
  code: string
  name: string
  type: BranchListItem["type"]
  isActive: boolean
  address?: string | null
  phone?: string | null
  taxId?: string | null
}

export type UpdateMasterBranchInput = {
  name: string
  isActive: boolean
  address?: string | null
  phone?: string | null
  taxId?: string | null
}

export function createMasterBranch(
  input: CreateMasterBranchInput
): Promise<{ item: BranchListItem }> {
  return fetch("/api/master/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ item: BranchListItem }>
  })
}

export function patchMasterBranch(
  id: string,
  body: UpdateMasterBranchInput | { deleted: true } | { deleted: false }
): Promise<{ item: BranchListItem }> {
  return fetch(`/api/master/branches/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ item: BranchListItem }>
  })
}

export function fetchMasterBranches(
  query: BranchListQuery
): Promise<MasterListResponse<BranchListItem>> {
  const params = toSearchParams({
    mode: query.mode,
    code: query.code,
    name: query.name,
    type: query.type,
    activeOnly: query.activeOnly ? "1" : undefined,
  })
  return fetch(`/api/master/branches?${params}`).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<MasterListResponse<BranchListItem>>
  })
}

export type CreateMasterStaffInput = {
  staffId: string
  name: string
  role: StaffListItem["role"]
  branchId: string
  password?: string
  posCanCollect?: boolean
  allowAnyBranchLogin?: boolean
}

export type UpdateMasterStaffInput = {
  name: string
  role: StaffListItem["role"]
  branchId: string
  posCanCollect?: boolean
  allowAnyBranchLogin?: boolean
}

export function createMasterStaff(
  input: CreateMasterStaffInput
): Promise<{ item: StaffListItem }> {
  return fetch("/api/master/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ item: StaffListItem }>
  })
}

export function patchMasterStaff(
  id: string,
  body:
    | UpdateMasterStaffInput
    | { deleted: true }
    | { deleted: false }
    | { password: string }
): Promise<{ item: StaffListItem }> {
  return fetch(`/api/master/staff/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ item: StaffListItem }>
  })
}

export function fetchMasterStaff(
  query: StaffListQuery
): Promise<MasterListResponse<StaffListItem>> {
  const params = toSearchParams({
    mode: query.mode,
    staffId: query.staffId,
    name: query.name,
    role: query.role ?? undefined,
    branchCode: query.branchCode,
  })
  return fetch(`/api/master/staff?${params}`).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<MasterListResponse<StaffListItem>>
  })
}

export type MasterStaffEvidenceDetail = {
  staffId: string
  photoUploaded: boolean
  idCardUploaded: boolean
  evidenceComplete: boolean
  photoUrl: string | null
  idCardUrl: string | null
}

export function fetchMasterStaffEvidence(
  staffRowId: string
): Promise<MasterStaffEvidenceDetail> {
  return fetch(`/api/master/staff/${encodeURIComponent(staffRowId)}/evidence`, {
    cache: "no-store",
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<MasterStaffEvidenceDetail>
  })
}

export function deleteMasterStaffEvidence(
  staffRowId: string
): Promise<MasterStaffEvidenceDetail> {
  return fetch(`/api/master/staff/${encodeURIComponent(staffRowId)}/evidence`, {
    method: "DELETE",
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<MasterStaffEvidenceDetail & { ok: true }>
  })
}

export type CreateMasterReferenceInput = {
  productId: string
  hookGroup: string
  hookNo: number
  supplierCode: string
  productCode: string
  productGroup?: string | null
}

export type UpdateMasterReferenceInput = {
  hookGroup: string
  hookNo: number
  supplierCode: string
  productCode: string
  productGroup?: string | null
}

export type UpdateMasterProductInput = {
  name: string
  productType: ProductReferenceListItem["productType"]
}

export type CreateMasterProductWithReferenceInput = UpdateMasterProductInput & {
  productCode: string
  hookGroup: string
  hookNo: number
  supplierCode: string
  productGroup?: string | null
}

export function createMasterProductWithReference(
  input: CreateMasterProductWithReferenceInput
): Promise<{ item: ProductReferenceListItem }> {
  return fetch("/api/master/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ item: ProductReferenceListItem }>
  })
}

export function createMasterProductReference(
  input: CreateMasterReferenceInput
): Promise<{ item: ProductReferenceListItem }> {
  return fetch("/api/master/product-reference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ item: ProductReferenceListItem }>
  })
}

export function patchMasterProductReference(
  id: string,
  body: UpdateMasterReferenceInput | { deleted: true } | { deleted: false }
): Promise<{ item: ProductReferenceListItem }> {
  return fetch(`/api/master/product-reference/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ item: ProductReferenceListItem }>
  })
}

export function patchMasterProduct(
  productId: string,
  body: UpdateMasterProductInput | { deleted: true } | { deleted: false }
): Promise<{ item: ProductReferenceListItem }> {
  return fetch(`/api/master/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ item: ProductReferenceListItem }>
  })
}

export function fetchMasterLatestHookNo(
  hookGroup: string
): Promise<{ nextHookNo: number }> {
  const params = toSearchParams({ hookGroup })
  return fetch(`/api/master/reference-stock/latest-hook-no?${params}`).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<{ nextHookNo: number }>
  })
}

export function fetchMasterProductByCode(
  code: string
): Promise<{ code: string; name: string } | null> {
  const params = toSearchParams({ code })
  return fetch(`/api/master/products/by-code?${params}`).then(async (res) => {
    if (res.status === 404) return null
    if (!res.ok) return throwMasterFetchError(res)
    const body = (await res.json()) as { product: { code: string; name: string } }
    return body.product
  })
}

export function fetchMasterProductReference(
  query: ProductReferenceListQuery
): Promise<MasterListResponse<ProductReferenceListItem>> {
  const params = toSearchParams({
    mode: query.mode,
    productCode: query.productCode,
    productName: query.productName,
    hookGroup: query.hookGroup,
    hookNo: query.hookNo,
    supplierCode: query.supplierCode,
    productGroup: query.productGroup,
    referenceStatus: query.referenceStatus === "all" ? undefined : query.referenceStatus,
  })
  return fetch(`/api/master/product-reference?${params}`).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<MasterListResponse<ProductReferenceListItem>>
  })
}
