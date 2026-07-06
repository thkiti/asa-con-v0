import { AccountingPeriodStatus, type Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { OPENING_BALANCE_PERIOD_KEY } from "@/lib/finance/opening-balance-period"
import { accountingPeriodUniqueWhere } from "@/lib/finance/period-lookup"
import { bootstrapPeriodIfMissing } from "@/lib/finance/period-setup"
import { prisma } from "@/lib/shared/prisma"

export const ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET = {
  legalEntityCode: "AS",
  periodKey: OPENING_BALANCE_PERIOD_KEY,
  entryNo: "MJV-260001",
  description: "Opening Balance 2026",
  expectedEntryDate: new Date("2025-12-31T00:00:00.000Z"),
} as const satisfies {
  legalEntityCode: DocumentEntityCode
  periodKey: string
  entryNo: string
  description: string
  expectedEntryDate: Date
}

export class BootstrapAsasOpeningBalancePeriodError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "BootstrapAsasOpeningBalancePeriodError"
    this.code = code
  }
}

export type AdPeriodSnapshot = {
  legalEntityCode: string
  periodKey: string
  status: string
  id: string
}

export type BootstrapAsasOpeningBalancePeriodPlan = {
  periodExists: boolean
  existingPeriodStatus: string | null
  willBootstrap: boolean
  manualJournal: {
    id: string
    entryNo: string
    status: string
    entryDate: string
    description: string | null
  }
  adPeriods: AdPeriodSnapshot[]
}

export type BootstrapAsasOpeningBalancePeriodVerifyResult = {
  asPeriod: {
    id: string
    periodKey: string
    status: string
    legalEntityCode: string
  }
  manualJournal: {
    id: string
    entryNo: string
    status: string
    entryDate: string
  }
  adPeriods: AdPeriodSnapshot[]
  checks: Array<{ id: string; passed: boolean; detail: string }>
}

async function loadTargetManualJournal(
  tx: Prisma.TransactionClient
): Promise<{
  id: string
  entryNo: string
  status: string
  entryDate: Date
  description: string | null
}> {
  const { legalEntityCode, entryNo, description, expectedEntryDate } =
    ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET

  const matches = await tx.manualJournalEntry.findMany({
    where: { legalEntityCode, entryNo, description },
    select: {
      id: true,
      entryNo: true,
      status: true,
      entryDate: true,
      description: true,
    },
  })

  if (matches.length === 0) {
    throw new BootstrapAsasOpeningBalancePeriodError(
      `No ${legalEntityCode} manual journal entry found for ${entryNo} / "${description}"`,
      "MJV_NOT_FOUND"
    )
  }
  if (matches.length > 1) {
    throw new BootstrapAsasOpeningBalancePeriodError(
      `Multiple ${legalEntityCode} manual journal entries found for ${entryNo} / "${description}"`,
      "MJV_AMBIGUOUS"
    )
  }

  const entry = matches[0]!

  if (entry.entryDate.getTime() !== expectedEntryDate.getTime()) {
    throw new BootstrapAsasOpeningBalancePeriodError(
      `Expected entry date ${expectedEntryDate.toISOString().slice(0, 10)} (current: ${entry.entryDate.toISOString().slice(0, 10)})`,
      "WRONG_ENTRY_DATE"
    )
  }

  return entry
}

async function snapshotAdPeriods(
  tx: Prisma.TransactionClient
): Promise<AdPeriodSnapshot[]> {
  const rows = await tx.accountingPeriod.findMany({
    where: {
      legalEntityCode: "AD",
      periodKey: { in: ["2025-12", "2026-01"] },
    },
    select: {
      id: true,
      legalEntityCode: true,
      periodKey: true,
      status: true,
    },
    orderBy: [{ periodKey: "asc" }],
  })

  return rows.map((row) => ({
    id: row.id,
    legalEntityCode: row.legalEntityCode,
    periodKey: row.periodKey,
    status: row.status,
  }))
}

function assertPeriodAllowsBootstrap(status: string | null): void {
  if (status == null) return
  if (status === AccountingPeriodStatus.OPEN) return

  throw new BootstrapAsasOpeningBalancePeriodError(
    `AS/${ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET.periodKey} already exists with status ${status} — bootstrap will not change it`,
    "PERIOD_NOT_OPEN"
  )
}

export async function planBootstrapAsasOpeningBalancePeriod(
  tx: Prisma.TransactionClient = prisma
): Promise<BootstrapAsasOpeningBalancePeriodPlan> {
  const { legalEntityCode, periodKey } = ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET

  const manualJournal = await loadTargetManualJournal(tx)

  const existingPeriod = await tx.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ legalEntityCode, periodKey }),
    select: { status: true },
  })

  assertPeriodAllowsBootstrap(existingPeriod?.status ?? null)

  const adPeriods = await snapshotAdPeriods(tx)

  return {
    periodExists: existingPeriod != null,
    existingPeriodStatus: existingPeriod?.status ?? null,
    willBootstrap: existingPeriod == null,
    manualJournal: {
      id: manualJournal.id,
      entryNo: manualJournal.entryNo,
      status: manualJournal.status,
      entryDate: manualJournal.entryDate.toISOString(),
      description: manualJournal.description,
    },
    adPeriods,
  }
}

export type ExecuteBootstrapAsasOpeningBalancePeriodResult = {
  period: {
    id: string
    periodKey: string
    status: string
    legalEntityCode: string
  }
  bootstrapped: boolean
  adPeriodsBefore: AdPeriodSnapshot[]
}

export async function executeBootstrapAsasOpeningBalancePeriod(): Promise<ExecuteBootstrapAsasOpeningBalancePeriodResult> {
  return prisma.$transaction(async (tx) => {
    const plan = await planBootstrapAsasOpeningBalancePeriod(tx)
    const adPeriodsBefore = plan.adPeriods

    const { legalEntityCode, periodKey } = ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET

    const periodBefore = await tx.accountingPeriod.findUnique({
      where: accountingPeriodUniqueWhere({ legalEntityCode, periodKey }),
      select: { id: true },
    })

    const period = await bootstrapPeriodIfMissing(tx, {
      periodKey,
      legalEntityCode,
    })

    if (period.legalEntityCode !== "AS") {
      throw new BootstrapAsasOpeningBalancePeriodError(
        "Bootstrap returned unexpected legal entity",
        "WRONG_ENTITY"
      )
    }

    if (period.periodKey !== periodKey) {
      throw new BootstrapAsasOpeningBalancePeriodError(
        "Bootstrap returned unexpected period key",
        "WRONG_PERIOD"
      )
    }

    return {
      period: {
        id: period.id,
        periodKey: period.periodKey,
        status: period.status,
        legalEntityCode: period.legalEntityCode,
      },
      bootstrapped: periodBefore == null,
      adPeriodsBefore,
    }
  })
}

export async function verifyBootstrapAsasOpeningBalancePeriod(input?: {
  adPeriodsBefore?: AdPeriodSnapshot[]
  requireConfirmedMjv?: boolean
}): Promise<BootstrapAsasOpeningBalancePeriodVerifyResult> {
  const { legalEntityCode, periodKey, entryNo } =
    ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET
  const requireConfirmed = input?.requireConfirmedMjv ?? true

  const asPeriod = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ legalEntityCode, periodKey }),
    select: {
      id: true,
      periodKey: true,
      status: true,
      legalEntityCode: true,
    },
  })

  const manualJournal = await prisma.manualJournalEntry.findFirst({
    where: {
      legalEntityCode,
      entryNo,
      description: ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET.description,
    },
    select: {
      id: true,
      entryNo: true,
      status: true,
      entryDate: true,
    },
  })

  const adPeriods = await snapshotAdPeriods(prisma)

  const checks: BootstrapAsasOpeningBalancePeriodVerifyResult["checks"] = []

  checks.push({
    id: "as-period-exists",
    passed: asPeriod != null,
    detail: asPeriod
      ? `AS/${periodKey} exists (${asPeriod.id})`
      : `AS/${periodKey} is missing`,
  })

  checks.push({
    id: "as-period-open",
    passed: asPeriod?.status === AccountingPeriodStatus.OPEN,
    detail: asPeriod
      ? `AS/${periodKey} status is ${asPeriod.status}`
      : "AS period row missing",
  })

  checks.push({
    id: "as-mjv-exists",
    passed: manualJournal != null,
    detail: manualJournal
      ? `${entryNo} found (${manualJournal.id})`
      : `${entryNo} not found`,
  })

  checks.push({
    id: "as-mjv-confirmed",
    passed: requireConfirmed
      ? manualJournal?.status === "CONFIRMED"
      : manualJournal != null && manualJournal.status !== "CANCELLED",
    detail: manualJournal
      ? `${entryNo} status is ${manualJournal.status}${requireConfirmed ? " (expected CONFIRMED before UI post)" : ""}`
      : "Manual journal missing",
  })

  const adUnchanged =
    input?.adPeriodsBefore == null
      ? adPeriods.length > 0
      : adPeriodsUnchanged(input.adPeriodsBefore, adPeriods)

  checks.push({
    id: "ad-periods-unchanged",
    passed: adUnchanged,
    detail:
      input?.adPeriodsBefore == null
        ? `AD periods present: ${adPeriods.map((p) => `${p.periodKey}=${p.status}`).join(", ") || "(none)"}`
        : adUnchanged
          ? "AD 2025-12 / 2026-01 rows match pre-bootstrap snapshot"
          : "AD period rows differ from pre-bootstrap snapshot",
  })

  return {
    asPeriod: asPeriod ?? {
      id: "(missing)",
      periodKey,
      status: "(missing)",
      legalEntityCode,
    },
    manualJournal: manualJournal
      ? {
          id: manualJournal.id,
          entryNo: manualJournal.entryNo,
          status: manualJournal.status,
          entryDate: manualJournal.entryDate.toISOString(),
        }
      : {
          id: "(missing)",
          entryNo,
          status: "(missing)",
          entryDate: "(missing)",
        },
    adPeriods,
    checks,
  }
}

function adPeriodsUnchanged(
  before: AdPeriodSnapshot[],
  after: AdPeriodSnapshot[]
): boolean {
  if (before.length !== after.length) return false
  const afterByKey = new Map(after.map((row) => [row.periodKey, row]))
  for (const row of before) {
    const current = afterByKey.get(row.periodKey)
    if (!current) return false
    if (current.id !== row.id || current.status !== row.status) return false
  }
  return true
}

export function formatBootstrapAsasOpeningBalancePeriodPlan(
  plan: BootstrapAsasOpeningBalancePeriodPlan
): string {
  return [
    "ASAS opening balance period bootstrap plan",
    `  target: ${ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET.legalEntityCode} / ${ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET.periodKey}`,
    `  periodExists: ${plan.periodExists}`,
    `  existingPeriodStatus: ${plan.existingPeriodStatus ?? "(none)"}`,
    `  willBootstrap: ${plan.willBootstrap}`,
    `  manualJournal.id: ${plan.manualJournal.id}`,
    `  manualJournal.entryNo: ${plan.manualJournal.entryNo}`,
    `  manualJournal.status: ${plan.manualJournal.status}`,
    `  manualJournal.entryDate: ${plan.manualJournal.entryDate}`,
    `  manualJournal.description: ${plan.manualJournal.description ?? "(none)"}`,
    `  adPeriods: ${plan.adPeriods.map((p) => `${p.periodKey}=${p.status}`).join(", ") || "(none)"}`,
  ].join("\n")
}

export function formatBootstrapAsasOpeningBalancePeriodVerify(
  result: BootstrapAsasOpeningBalancePeriodVerifyResult
): string {
  const lines = [
    "ASAS opening balance period bootstrap verification",
    `  AS period: ${result.asPeriod.legalEntityCode}/${result.asPeriod.periodKey} status=${result.asPeriod.status}`,
    `  manualJournal: ${result.manualJournal.entryNo} status=${result.manualJournal.status}`,
    `  AD periods: ${result.adPeriods.map((p) => `${p.periodKey}=${p.status}`).join(", ") || "(none)"}`,
    "  checks:",
    ...result.checks.map(
      (check) => `    ${check.passed ? "PASS" : "FAIL"} — ${check.id}: ${check.detail}`
    ),
  ]
  return lines.join("\n")
}

export function assertBootstrapAsasOpeningBalancePeriodVerifyPassed(
  result: BootstrapAsasOpeningBalancePeriodVerifyResult
): void {
  const failed = result.checks.filter((check) => !check.passed)
  if (failed.length > 0) {
    throw new BootstrapAsasOpeningBalancePeriodError(
      `Verification failed: ${failed.map((check) => check.id).join(", ")}`,
      "VERIFY_FAILED"
    )
  }
}
