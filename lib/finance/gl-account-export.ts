import { expectedNormalBalance } from "./gl-account-normal-balance"
import { GL_ACCOUNT_CSV_TEMPLATE_HEADER } from "./gl-account-import-types"
import {
  listAllGlAccountsForExport,
  type GlAccountListFilter,
  type GlAccountListPrisma,
  type GlAccountListRow,
} from "./gl-account-list"

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowToCsvLine(row: GlAccountListRow): string {
  const normalBalance = expectedNormalBalance(row.accountType)
  const fields = [
    row.code,
    row.name,
    row.accountType,
    normalBalance,
    row.parentCode ?? "",
    row.isActive ? "true" : "false",
  ]
  return fields.map(escapeCsvField).join(",")
}

export async function exportGlAccountsCsv(
  prisma: GlAccountListPrisma,
  filter: Omit<GlAccountListFilter, "limit" | "offset"> = {}
): Promise<string> {
  const rows = await listAllGlAccountsForExport(prisma, filter)
  const lines = [GL_ACCOUNT_CSV_TEMPLATE_HEADER, ...rows.map(rowToCsvLine)]
  return `${lines.join("\n")}\n`
}

export function glAccountExportFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `chart-of-accounts-${y}-${m}-${d}.csv`
}
