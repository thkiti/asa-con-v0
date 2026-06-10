import type {
  GlAccountImportApplyResult,
  GlAccountImportPreview,
} from "@/lib/finance/gl-account-import-types"
import type { GlAccountListResult, GlAccountTreeNode } from "@/lib/finance/gl-account-list"

export type GlAccountBrowserFilter = {
  accountType?: string
  isActive?: "true" | "false" | "all"
  search?: string
  view?: "flat" | "tree"
  limit?: number
  offset?: number
}

export type GlAccountListResponse =
  | ({ view: "flat" } & GlAccountListResult)
  | { view: "tree"; accounts: GlAccountTreeNode[]; total: number }

function buildQuery(filter: GlAccountBrowserFilter): string {
  const params = new URLSearchParams()
  if (filter.accountType?.trim()) params.set("accountType", filter.accountType.trim())
  if (filter.isActive) params.set("isActive", filter.isActive)
  if (filter.search?.trim()) params.set("search", filter.search.trim())
  if (filter.view) params.set("view", filter.view)
  if (filter.limit != null) params.set("limit", String(filter.limit))
  if (filter.offset != null) params.set("offset", String(filter.offset))
  const q = params.toString()
  return q ? `?${q}` : ""
}

async function parseError(res: Response): Promise<string> {
  let message = res.statusText || "Request failed"
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) message = body.error
  } catch {
    // keep statusText
  }
  return message
}

export async function fetchGlAccounts(
  filter: GlAccountBrowserFilter = {}
): Promise<GlAccountListResponse> {
  const res = await fetch(`/api/finance/accounts${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<GlAccountListResponse>
}

export async function downloadGlAccountsExport(
  filter: Omit<GlAccountBrowserFilter, "view" | "limit" | "offset"> = {}
): Promise<void> {
  const params = new URLSearchParams()
  if (filter.accountType?.trim()) params.set("accountType", filter.accountType.trim())
  if (filter.isActive) params.set("isActive", filter.isActive)
  if (filter.search?.trim()) params.set("search", filter.search.trim())
  const q = params.toString()
  const res = await fetch(`/api/finance/accounts/export${q ? `?${q}` : ""}`)
  if (!res.ok) throw new Error(await parseError(res))
  const blob = await res.blob()
  const disposition = res.headers.get("Content-Disposition") ?? ""
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? "chart-of-accounts.csv"
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCoaTemplate(): void {
  window.location.assign("/api/finance/accounts/import/template")
}

export async function previewCoaImport(file: File): Promise<GlAccountImportPreview> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch("/api/finance/accounts/import/preview", {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<GlAccountImportPreview>
}

export async function applyCoaImport(file: File): Promise<GlAccountImportApplyResult> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch("/api/finance/accounts/import", {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<GlAccountImportApplyResult>
}
