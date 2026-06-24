import type { PettyCashVoucherSaveLineInput } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-types"

export function parsePettyCashVoucherSaveLines(body: unknown): PettyCashVoucherSaveLineInput[] {
  if (!Array.isArray(body)) {
    throw new Error("lines must be an array")
  }

  return body.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`lines[${index}] must be an object`)
    }
    const line = row as Record<string, unknown>
    const accountCode =
      line.accountCode != null ? String(line.accountCode).trim() : undefined
    const glAccountId =
      line.glAccountId != null ? String(line.glAccountId).trim() : undefined

    if (!accountCode && !glAccountId) {
      throw new Error(`lines[${index}]: accountCode or glAccountId is required`)
    }

    const debit =
      typeof line.debit === "string" || typeof line.debit === "number"
        ? line.debit
        : "0"
    const credit =
      typeof line.credit === "string" || typeof line.credit === "number"
        ? line.credit
        : "0"

    return {
      ...(accountCode ? { accountCode } : {}),
      ...(glAccountId ? { glAccountId } : {}),
      debit,
      credit,
      memo: line.memo != null ? String(line.memo) : null,
    }
  })
}

export { parseEntryDate, parseLegalEntityCode } from "@/app/api/finance/manual-journal-entries/shared/parse-manual-journal-entry-body"
