import type { InvoiceVoucherSaveLineInput } from "@/lib/finance/invoice-voucher/invoice-voucher-types"

export function parseInvoiceVoucherSaveLines(body: unknown): InvoiceVoucherSaveLineInput[] {
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
      throw new Error(
        `lines[${index}]: accountCode or glAccountId is required`
      )
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

export { parseEntryDate as parseInvoiceDate, parseLegalEntityCode } from "@/app/api/finance/manual-journal-entries/shared/parse-manual-journal-entry-body"

export function parseDueDate(body: unknown): Date | null | undefined {
  if (body === undefined) return undefined
  if (body == null || body === "") return null
  const date = new Date(String(body))
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid dueDate")
  }
  return date
}
