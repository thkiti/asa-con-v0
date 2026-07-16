import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"
import {
  DEFAULT_HISTORICAL_REFUND_BEFORE,
  DEFAULT_HISTORICAL_REFUND_FROM,
  HISTORICAL_POS_REFUND_IMPORT_CONFIRM_TOKEN,
} from "./constants"
import {
  monthKeyToRange,
  parseHistoricalPostingDateRange,
} from "@/lib/pos/historical-sale-posting/date-range"
import type { HistoricalRefundCliOptions } from "./types"

export function parseHistoricalRefundImportArgs(
  argv: string[]
): HistoricalRefundCliOptions {
  const execute = argv.includes("--execute")
  const confirmArg = argv.find((a) => a.startsWith("--confirm="))
  const fromArg = argv.find((a) => a.startsWith("--from="))
  const beforeArg = argv.find((a) => a.startsWith("--before="))
  const monthArg = argv.find((a) => a.startsWith("--month="))
  const branchArg = argv.find((a) => a.startsWith("--branch="))
  const limitArg = argv.find((a) => a.startsWith("--limit="))
  const fileArg = argv.find((a) => a.startsWith("--file="))
  const csv = argv.includes("--csv")

  const monthKey = monthArg?.split("=")[1]?.trim()
  const monthRange = monthKey ? monthKeyToRange(monthKey) : null

  return {
    execute,
    confirm: confirmArg?.split("=")[1] ?? "",
    fromDateKey:
      monthRange?.fromDateKey ?? fromArg?.split("=")[1] ?? DEFAULT_HISTORICAL_REFUND_FROM,
    beforeDateKey:
      monthRange?.beforeDateKey ??
      beforeArg?.split("=")[1] ??
      DEFAULT_HISTORICAL_REFUND_BEFORE,
    branchCode: branchArg?.split("=")[1]?.trim() || undefined,
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    csv,
    monthKey,
    file: fileArg?.split("=")[1]?.trim() || undefined,
  }
}

export function validateHistoricalRefundImportExecute(
  options: HistoricalRefundCliOptions,
  connectionString: string
): void {
  if (!options.execute) return

  const dbTarget = parseDatabaseTarget(connectionString)
  if (
    !dbTarget.isLocalhost &&
    options.confirm !== HISTORICAL_POS_REFUND_IMPORT_CONFIRM_TOKEN
  ) {
    throw new Error(
      `Refusing execute on remote database: pass --confirm=${HISTORICAL_POS_REFUND_IMPORT_CONFIRM_TOKEN}`
    )
  }
}
