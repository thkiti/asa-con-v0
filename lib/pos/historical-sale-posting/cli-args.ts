import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"
import {
  DEFAULT_HISTORICAL_BEFORE,
  DEFAULT_HISTORICAL_FROM,
  HISTORICAL_POS_POSTING_CONFIRM_TOKEN,
} from "./constants"
import {
  monthKeyToRange,
  parseHistoricalPostingDateRange,
} from "./date-range"
import type { HistoricalPostingCliOptions } from "./types"

export function parseHistoricalPostingArgs(
  argv: string[]
): HistoricalPostingCliOptions {
  const execute = argv.includes("--execute")
  const confirmArg = argv.find((a) => a.startsWith("--confirm="))
  const fromArg = argv.find((a) => a.startsWith("--from="))
  const beforeArg = argv.find((a) => a.startsWith("--before="))
  const monthArg = argv.find((a) => a.startsWith("--month="))
  const branchArg = argv.find((a) => a.startsWith("--branch="))
  const limitArg = argv.find((a) => a.startsWith("--limit="))
  const csv = argv.includes("--csv")

  const monthKey = monthArg?.split("=")[1]?.trim()
  const monthRange = monthKey ? monthKeyToRange(monthKey) : null

  return {
    execute,
    confirm: confirmArg?.split("=")[1] ?? "",
    fromDateKey: monthRange?.fromDateKey ?? fromArg?.split("=")[1] ?? DEFAULT_HISTORICAL_FROM,
    beforeDateKey:
      monthRange?.beforeDateKey ?? beforeArg?.split("=")[1] ?? DEFAULT_HISTORICAL_BEFORE,
    branchCode: branchArg?.split("=")[1]?.trim() || undefined,
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    csv,
    monthKey,
  }
}

export function validateHistoricalPostingExecute(
  options: HistoricalPostingCliOptions,
  connectionString: string
): void {
  if (!options.execute) return

  const dbTarget = parseDatabaseTarget(connectionString)
  if (!dbTarget.isLocalhost && options.confirm !== HISTORICAL_POS_POSTING_CONFIRM_TOKEN) {
    throw new Error(
      `Refusing execute on remote database: pass --confirm=${HISTORICAL_POS_POSTING_CONFIRM_TOKEN}`
    )
  }
}
