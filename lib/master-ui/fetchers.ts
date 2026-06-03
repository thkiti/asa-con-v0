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
}

export type UpdateMasterBranchInput = {
  name: string
  isActive: boolean
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
    q: query.q,
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
}

export type UpdateMasterStaffInput = {
  name: string
  role: StaffListItem["role"]
  branchId: string
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
    q: query.q,
    role: query.role ?? undefined,
    branchCode: query.branchCode,
  })
  return fetch(`/api/master/staff?${params}`).then(async (res) => {
    if (!res.ok) return throwMasterFetchError(res)
    return res.json() as Promise<MasterListResponse<StaffListItem>>
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
