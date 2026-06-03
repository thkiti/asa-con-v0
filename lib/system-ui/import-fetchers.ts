import type {
  ImportApiResultView,
  ImportEntityKey,
  ImportReportView,
  ImportReportsResponse,
  ImportStatusResponse,
  LogoutResponse,
} from "./import-types"

async function throwImportFetchError(res: Response): Promise<never> {
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

function isImportApiResult(body: unknown): body is ImportApiResultView {
  if (!body || typeof body !== "object") return false
  const candidate = body as ImportApiResultView
  return (
    typeof candidate.success === "boolean" &&
    typeof candidate.failed === "boolean" &&
    candidate.report != null
  )
}

export function fetchImportStatus(): Promise<ImportStatusResponse> {
  return fetch("/api/system/import/status").then(async (res) => {
    if (!res.ok) return throwImportFetchError(res)
    return res.json() as Promise<ImportStatusResponse>
  })
}

export function postImportDryRun(entity: ImportEntityKey): Promise<ImportApiResultView> {
  return fetch("/api/system/import/dry-run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, profile: "devboard-v1" }),
  }).then(async (res) => {
    if (!res.ok) return throwImportFetchError(res)
    const body: unknown = await res.json()
    if (!isImportApiResult(body)) {
      throw new Error("Invalid import dry-run response")
    }
    return body
  })
}

export function postImportApply(input: {
  entity: ImportEntityKey
  dryRunReportId: string
}): Promise<ImportApiResultView> {
  return fetch("/api/system/import/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity: input.entity,
      dryRunReportId: input.dryRunReportId,
      confirm: true,
      profile: "devboard-v1",
    }),
  }).then(async (res) => {
    const body: unknown = await res.json()
    if (isImportApiResult(body)) {
      return body
    }
    if (!res.ok) return throwImportFetchError(res)
    throw new Error("Invalid import apply response")
  })
}

export function fetchImportReports(entity?: ImportEntityKey): Promise<ImportReportsResponse> {
  const query = entity ? `?entity=${encodeURIComponent(entity)}&limit=10` : "?limit=10"
  return fetch(`/api/system/import/reports${query}`).then(async (res) => {
    if (!res.ok) return throwImportFetchError(res)
    return res.json() as Promise<ImportReportsResponse>
  })
}

export function fetchImportReport(reportId: string): Promise<ImportReportView> {
  return fetch(`/api/system/import/reports/${encodeURIComponent(reportId)}`).then(async (res) => {
    if (!res.ok) return throwImportFetchError(res)
    return res.json() as Promise<ImportReportView>
  })
}

export function postLogout(): Promise<LogoutResponse> {
  return fetch("/api/auth/logout", { method: "POST" }).then(async (res) => {
    if (!res.ok) return throwImportFetchError(res)
    return res.json() as Promise<LogoutResponse>
  })
}
