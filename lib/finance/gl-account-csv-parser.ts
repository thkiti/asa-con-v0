import { GlAccountType } from "@/generated/prisma/client"
import { GlAccountImportError } from "./gl-account-import-errors"
import {
  GL_ACCOUNT_CODE_MAX_LENGTH,
  GL_ACCOUNT_CSV_REQUIRED_HEADERS,
  GL_ACCOUNT_IMPORT_MAX_ROWS,
  GL_ACCOUNT_NAME_MAX_LENGTH,
  type GlAccountCsvRow,
  type GlAccountImportErrorRow,
} from "./gl-account-import-types"
import {
  parseNormalBalance,
  validateNormalBalanceForType,
} from "./gl-account-normal-balance"

export type GlAccountCsvParseResult = {
  rows: GlAccountCsvRow[]
  errors: GlAccountImportErrorRow[]
  warnings: string[]
}

const ACCOUNT_CODE_PATTERN = /^[A-Za-z0-9._-]+$/

function cleanCsvCell(value: string): string {
  return value.trim().replace(/^"|"$/g, "")
}

function splitCsvLine(line: string): string[] {
  const trimmed = line.trim()
  const unquoted =
    trimmed.startsWith('"') && trimmed.endsWith('"')
      ? trimmed.slice(1, -1)
      : trimmed
  return unquoted.split(",").map(cleanCsvCell)
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase()
}

function parseIsActive(value: string): boolean | null {
  const raw = value.trim().toLowerCase()
  if (!raw) return null
  if (["true", "1", "yes", "y"].includes(raw)) return true
  if (["false", "0", "no", "n"].includes(raw)) return false
  return null
}

function parseAccountType(value: string): GlAccountType | null {
  const raw = value.trim().toUpperCase()
  if ((Object.values(GlAccountType) as string[]).includes(raw)) {
    return raw as GlAccountType
  }
  return null
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((cell) => !cell.trim())
}

export function parseGlAccountCsv(content: string): GlAccountCsvParseResult {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/)
  const errors: GlAccountImportErrorRow[] = []
  const warnings: string[] = []
  const rows: GlAccountCsvRow[] = []

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
  if (nonEmptyLines.length === 0) {
    throw new GlAccountImportError("CSV file is empty", "EMPTY_FILE")
  }

  const headerCells = splitCsvLine(nonEmptyLines[0] ?? "")
  const headerIndex = new Map<string, number>()
  for (let i = 0; i < headerCells.length; i++) {
    const key = normalizeHeader(headerCells[i] ?? "")
    if (key && !headerIndex.has(key)) {
      headerIndex.set(key, i)
    }
  }

  for (const required of GL_ACCOUNT_CSV_REQUIRED_HEADERS) {
    if (!headerIndex.has(required)) {
      throw new GlAccountImportError(
        `Missing required header: ${required}`,
        "MISSING_REQUIRED_HEADER"
      )
    }
  }

  const knownHeaders = new Set([
    "accountcode",
    "accountname",
    "accounttype",
    "normalbalance",
    "parentaccountcode",
    "isactive",
  ])
  for (const key of headerIndex.keys()) {
    if (!knownHeaders.has(key)) {
      warnings.push(`Unknown column ignored: ${key}`)
    }
  }

  let dataRowCount = 0
  for (let lineIndex = 1; lineIndex < nonEmptyLines.length; lineIndex++) {
    const rowNumber = lineIndex + 1
    const cells = splitCsvLine(nonEmptyLines[lineIndex] ?? "")
    if (isBlankRow(cells)) {
      warnings.push(`Row ${rowNumber}: empty row skipped`)
      continue
    }

    dataRowCount++
    if (dataRowCount > GL_ACCOUNT_IMPORT_MAX_ROWS) {
      throw new GlAccountImportError(
        `CSV exceeds maximum of ${GL_ACCOUNT_IMPORT_MAX_ROWS} data rows`,
        "FILE_TOO_LARGE"
      )
    }

    const get = (header: string) => cells[headerIndex.get(header) ?? -1] ?? ""

    const accountCode = get("accountcode").trim()
    const accountName = get("accountname").trim()
    const accountTypeRaw = get("accounttype").trim()
    const normalBalanceRaw = get("normalbalance").trim()
    const parentRaw = get("parentaccountcode").trim()
    const isActiveRaw = get("isactive").trim()

    if (!accountCode) {
      errors.push({
        rowNumber,
        code: "MISSING_ACCOUNT_CODE",
        message: "accountCode is required",
      })
      continue
    }
    if (
      accountCode.length > GL_ACCOUNT_CODE_MAX_LENGTH ||
      !ACCOUNT_CODE_PATTERN.test(accountCode)
    ) {
      errors.push({
        rowNumber,
        accountCode,
        code: "INVALID_ACCOUNT_CODE",
        message: "accountCode format is invalid",
      })
      continue
    }
    if (!accountName) {
      errors.push({
        rowNumber,
        accountCode,
        code: "MISSING_ACCOUNT_NAME",
        message: "accountName is required",
      })
      continue
    }
    if (accountName.length > GL_ACCOUNT_NAME_MAX_LENGTH) {
      errors.push({
        rowNumber,
        accountCode,
        code: "MISSING_ACCOUNT_NAME",
        message: `accountName exceeds ${GL_ACCOUNT_NAME_MAX_LENGTH} characters`,
      })
      continue
    }

    const accountType = parseAccountType(accountTypeRaw)
    if (!accountType) {
      errors.push({
        rowNumber,
        accountCode,
        code: "INVALID_ACCOUNT_TYPE",
        message: `Invalid accountType: ${accountTypeRaw}`,
      })
      continue
    }

    const normalBalance = parseNormalBalance(normalBalanceRaw)
    if (!normalBalance) {
      errors.push({
        rowNumber,
        accountCode,
        code: "INVALID_NORMAL_BALANCE",
        message: `Invalid normalBalance: ${normalBalanceRaw}`,
      })
      continue
    }
    if (!validateNormalBalanceForType(accountType, normalBalance)) {
      errors.push({
        rowNumber,
        accountCode,
        code: "NORMAL_BALANCE_TYPE_MISMATCH",
        message: `normalBalance ${normalBalance} does not match accountType ${accountType}`,
      })
      continue
    }

    let isActive: boolean | null = null
    if (isActiveRaw) {
      const parsed = parseIsActive(isActiveRaw)
      if (parsed === null) {
        errors.push({
          rowNumber,
          accountCode,
          code: "INVALID_IS_ACTIVE",
          message: `Invalid isActive: ${isActiveRaw}`,
        })
        continue
      }
      isActive = parsed
    }

    const parentAccountCode = parentRaw || null
    if (parentAccountCode && parentAccountCode === accountCode) {
      errors.push({
        rowNumber,
        accountCode,
        code: "SELF_PARENT",
        message: "parentAccountCode cannot equal accountCode",
      })
      continue
    }

    rows.push({
      rowNumber,
      accountCode,
      accountName,
      accountType,
      normalBalance,
      parentAccountCode,
      isActive,
    })
  }

  return { rows, errors, warnings }
}
