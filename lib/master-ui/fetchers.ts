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
