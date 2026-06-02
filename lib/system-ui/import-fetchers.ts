import type {
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

export function fetchImportStatus(): Promise<ImportStatusResponse> {
  return fetch("/api/system/import/status").then(async (res) => {
    if (!res.ok) return throwImportFetchError(res)
    return res.json() as Promise<ImportStatusResponse>
  })
}

export function postImportDryRun(entity: ImportEntityKey): Promise<ImportReportView> {
  return fetch("/api/system/import/dry-run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, profile: "devboard-v1" }),
  }).then(async (res) => {
    if (!res.ok) return throwImportFetchError(res)
    return res.json() as Promise<ImportReportView>
  })
}

export function postImportApply(input: {
  entity: ImportEntityKey
  dryRunReportId: string
}): Promise<ImportReportView> {
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
    if (!res.ok) return throwImportFetchError(res)
    return res.json() as Promise<ImportReportView>
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
