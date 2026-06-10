import type { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { GlAccountImportError } from "./gl-account-import-errors"
import type {
  GlAccountCsvRow,
  GlAccountFieldChange,
  GlAccountImportApplyResult,
  GlAccountImportErrorRow,
  GlAccountImportPreview,
  GlAccountPreviewRow,
} from "./gl-account-import-types"
import {
  checkOperationalAccountCodes,
  operationalCodesWarnings,
} from "./gl-account-operational-check"

export type GlAccountImportPrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine"
>

type ExistingAccount = {
  id: string
  code: string
  name: string
  accountType: string
  parentId: string | null
  isActive: boolean
  deleted: boolean
  parent: { code: string } | null
  _count: { journalEntryLines: number }
}

function parentCodeOf(account: ExistingAccount): string | null {
  return account.parent?.code ?? null
}

function detectDuplicateCodes(rows: GlAccountCsvRow[]): GlAccountImportErrorRow[] {
  const seen = new Map<string, number>()
  const errors: GlAccountImportErrorRow[] = []
  for (const row of rows) {
    const first = seen.get(row.accountCode)
    if (first != null) {
      errors.push({
        rowNumber: row.rowNumber,
        accountCode: row.accountCode,
        code: "DUPLICATE_CODE_IN_FILE",
        message: `Duplicate accountCode (first at row ${first})`,
      })
    } else {
      seen.set(row.accountCode, row.rowNumber)
    }
  }
  return errors
}

function validateParentGraph(
  rows: GlAccountCsvRow[],
  existingByCode: Map<string, ExistingAccount>
): GlAccountImportErrorRow[] {
  const errors: GlAccountImportErrorRow[] = []
  const fileCodes = new Set(rows.map((r) => r.accountCode))

  for (const row of rows) {
    if (!row.parentAccountCode) continue
    const inFile = fileCodes.has(row.parentAccountCode)
    const inDb = existingByCode.has(row.parentAccountCode)
    if (!inFile && !inDb) {
      errors.push({
        rowNumber: row.rowNumber,
        accountCode: row.accountCode,
        code: "ORPHAN_PARENT",
        message: `parentAccountCode ${row.parentAccountCode} not found`,
      })
    }
  }

  const graph = new Map<string, string | null>()
  for (const row of rows) {
    graph.set(row.accountCode, row.parentAccountCode)
  }

  for (const row of rows) {
    const visited = new Set<string>()
    let current: string | null = row.accountCode
    while (current) {
      if (visited.has(current)) {
        errors.push({
          rowNumber: row.rowNumber,
          accountCode: row.accountCode,
          code: "CIRCULAR_PARENT",
          message: "Circular parent reference detected",
        })
        break
      }
      visited.add(current)
      const parentCode: string | null = graph.get(current) ?? null
      if (parentCode && !graph.has(parentCode)) {
        break
      }
      current = parentCode
    }
  }

  return errors
}

function topologicalSort(rows: GlAccountCsvRow[]): GlAccountCsvRow[] {
  const byCode = new Map(rows.map((r) => [r.accountCode, r]))
  const sorted: GlAccountCsvRow[] = []
  const done = new Set<string>()

  const visit = (code: string, stack: Set<string>) => {
    if (done.has(code)) return
    if (stack.has(code)) return
    stack.add(code)
    const row = byCode.get(code)
    if (row?.parentAccountCode && byCode.has(row.parentAccountCode)) {
      visit(row.parentAccountCode, stack)
    }
    stack.delete(code)
    if (row) {
      done.add(code)
      sorted.push(row)
    }
  }

  const codes = [...rows].sort((a, b) => a.accountCode.localeCompare(b.accountCode))
  for (const row of codes) {
    visit(row.accountCode, new Set())
  }
  return sorted
}

function buildPreviewRow(
  row: GlAccountCsvRow,
  existing: ExistingAccount | undefined
): GlAccountPreviewRow {
  const isActive = row.isActive ?? (existing?.isActive ?? true)
  const base: GlAccountPreviewRow = {
    rowNumber: row.rowNumber,
    accountCode: row.accountCode,
    accountName: row.accountName,
    accountType: row.accountType,
    normalBalance: row.normalBalance,
    parentAccountCode: row.parentAccountCode,
    isActive,
    action: existing ? "UPDATE" : "INSERT",
    warnings: [],
  }

  if (!existing) {
    return base
  }

  const hasJournalLines = existing._count.journalEntryLines > 0
  const changes: GlAccountFieldChange[] = []
  const warnings: string[] = []

  if (existing.name !== row.accountName) {
    changes.push({
      field: "accountName",
      before: existing.name,
      after: row.accountName,
    })
  }

  if (existing.accountType !== row.accountType) {
    if (hasJournalLines) {
      return {
        ...base,
        action: "BLOCKED",
        blockReason: "BLOCKED_ACCOUNT_TYPE_CHANGE",
        changes: [
          {
            field: "accountType",
            before: existing.accountType,
            after: row.accountType,
          },
        ],
      }
    }
    changes.push({
      field: "accountType",
      before: existing.accountType,
      after: row.accountType,
    })
  }

  const beforeParent = parentCodeOf(existing)
  if (beforeParent !== row.parentAccountCode) {
    changes.push({
      field: "parentAccountCode",
      before: beforeParent ?? "",
      after: row.parentAccountCode ?? "",
    })
    if (hasJournalLines) {
      warnings.push(
        `Parent changed on account ${row.accountCode} with journal activity`
      )
    }
  }

  if (row.isActive !== null && existing.isActive !== row.isActive) {
    if (!row.isActive && hasJournalLines) {
      return {
        ...base,
        action: "BLOCKED",
        blockReason: "BLOCKED_HAS_JOURNAL_LINES",
        changes: [
          {
            field: "isActive",
            before: String(existing.isActive),
            after: String(row.isActive),
          },
        ],
      }
    }
    changes.push({
      field: "isActive",
      before: String(existing.isActive),
      after: String(row.isActive),
    })
  }

  if (changes.length === 0) {
    return {
      ...base,
      action: "UPDATE",
      changes: [],
      warnings,
    }
  }

  return { ...base, action: "UPDATE", changes, warnings }
}

export async function buildImportPreview(
  prisma: GlAccountImportPrisma,
  parsedRows: GlAccountCsvRow[],
  parseErrors: GlAccountImportErrorRow[],
  parseWarnings: string[]
): Promise<GlAccountImportPreview> {
  const fileErrors = [
    ...parseErrors,
    ...detectDuplicateCodes(parsedRows),
  ]

  const codes = parsedRows.map((r) => r.accountCode)
  const existingRows =
    codes.length === 0
      ? []
      : await prisma.glAccount.findMany({
          where: { code: { in: codes } },
          select: {
            id: true,
            code: true,
            name: true,
            accountType: true,
            parentId: true,
            isActive: true,
            deleted: true,
            parent: { select: { code: true } },
            _count: { select: { journalEntryLines: true } },
          },
        })

  const existingByCode = new Map(existingRows.map((a) => [a.code, a]))
  fileErrors.push(...validateParentGraph(parsedRows, existingByCode))

  const validRows = parsedRows.filter(
    (row) =>
      !fileErrors.some(
        (e) =>
          e.accountCode === row.accountCode &&
          (e.code === "DUPLICATE_CODE_IN_FILE" ||
            e.code === "ORPHAN_PARENT" ||
            e.code === "CIRCULAR_PARENT")
      )
  )

  if (validRows.length === 0 && fileErrors.length === 0) {
    fileErrors.push({
      code: "NO_VALID_ROWS",
      message: "No valid data rows in CSV",
    })
  }

  const inserts: GlAccountPreviewRow[] = []
  const updates: GlAccountPreviewRow[] = []
  const blocked: GlAccountPreviewRow[] = []

  for (const row of validRows) {
    const preview = buildPreviewRow(row, existingByCode.get(row.accountCode))
    if (preview.action === "BLOCKED") {
      blocked.push(preview)
    } else if (preview.action === "INSERT") {
      inserts.push(preview)
    } else {
      if (preview.changes && preview.changes.length > 0) {
        updates.push(preview)
      }
    }
  }

  const operationalCodesCheck = await checkOperationalAccountCodes(prisma)
  const opWarnings = operationalCodesWarnings(operationalCodesCheck)
  const rowWarnings = [...updates, ...inserts, ...blocked].flatMap(
    (r) => r.warnings ?? []
  )
  const warnings = [...parseWarnings, ...opWarnings, ...rowWarnings]

  const warningCount = warnings.length

  return {
    summary: {
      totalRows: parsedRows.length,
      insertCount: inserts.length,
      updateCount: updates.length,
      blockedCount: blocked.length,
      errorCount: fileErrors.length,
      warningCount,
    },
    inserts,
    updates,
    blocked,
    errors: fileErrors,
    warnings,
    operationalCodesCheck,
  }
}

async function resolveParentId(
  tx: Prisma.TransactionClient,
  parentAccountCode: string | null,
  cache: Map<string, string | null>
): Promise<string | null> {
  if (!parentAccountCode) return null
  if (cache.has(parentAccountCode)) {
    return cache.get(parentAccountCode) ?? null
  }
  const parent = await tx.glAccount.findUnique({
    where: { code: parentAccountCode },
    select: { id: true },
  })
  const id = parent?.id ?? null
  cache.set(parentAccountCode, id)
  return id
}

export async function applyGlAccountImport(
  tx: Prisma.TransactionClient,
  preview: GlAccountImportPreview
): Promise<GlAccountImportApplyResult> {
  if (preview.summary.errorCount > 0 || preview.summary.blockedCount > 0) {
    throw new GlAccountImportError(
      "Import validation failed — fix errors and blocked rows before apply",
      "VALIDATION_FAILED"
    )
  }

  const rowsToApply = [...preview.inserts, ...preview.updates]
  const csvRows: GlAccountCsvRow[] = rowsToApply.map((p) => ({
    rowNumber: p.rowNumber,
    accountCode: p.accountCode,
    accountName: p.accountName,
    accountType: p.accountType,
    normalBalance: p.normalBalance,
    parentAccountCode: p.parentAccountCode,
    isActive: p.isActive,
  }))

  const sorted = topologicalSort(csvRows)
  const parentCache = new Map<string, string | null>()
  let inserted = 0
  let updated = 0

  for (const row of sorted) {
    const parentId = await resolveParentId(tx, row.parentAccountCode, parentCache)
    const existing = await tx.glAccount.findUnique({
      where: { code: row.accountCode },
      select: { id: true },
    })

    if (existing) {
      await tx.glAccount.update({
        where: { code: row.accountCode },
        data: {
          name: row.accountName,
          accountType: row.accountType,
          parentId,
          isActive: row.isActive ?? true,
          deleted: false,
        },
      })
      updated++
      parentCache.set(row.accountCode, existing.id)
    } else {
      const created = await tx.glAccount.create({
        data: {
          code: row.accountCode,
          name: row.accountName,
          accountType: row.accountType,
          parentId,
          isActive: row.isActive ?? true,
          deleted: false,
        },
        select: { id: true },
      })
      inserted++
      parentCache.set(row.accountCode, created.id)
    }
  }

  const operationalCodesCheck = await checkOperationalAccountCodes(tx)
  const warnings = [
    ...preview.warnings,
    ...operationalCodesWarnings(operationalCodesCheck),
  ]

  return { inserted, updated, warnings, operationalCodesCheck }
}
