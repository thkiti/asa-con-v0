import {
  PaymentEvidenceStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { buildDocumentArchiveByDocumentDownloadPath } from "@/lib/document-archive-ui/paths"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"
import {
  assertPayInVaultEvidenceForPosting,
  isPayInEvidenceReadyForPosting,
  type PayInEvidenceVaultDb,
} from "./pay-in-evidence-vault"

export type PayInEvidenceRecord = {
  id: string
  collectorReportId: string
  collectNo: string
  branchId: string
  status: PaymentEvidenceStatus
  blobPathname: string | null
  blobUrl: string | null
  mimeType: string
  byteSize: number | null
  originalFilename: string | null
  uploadedAt: Date | null
  uploadedByStaffId: string | null
  bankDepositDate: Date | null
  bankAccountCode: string
  bankDepositVoucherId: string | null
}

export type PayInEvidenceSummary = {
  payInEvidenceId: string | null
  payInEvidenceStatus: PaymentEvidenceStatus | null
  payInEvidenceUrl: string | null
  payInSlipMissingWarning: boolean
  bankDepositDate: string | null
  bankAccountCode: string | null
  archiveAvailable: boolean | null
  payInEvidenceDownloadPath: string | null
}

export type PayInEvidenceDb = Pick<PrismaClient, "posPayInEvidence" | "collectorReport">

const DEFAULT_BANK_ACCOUNT_CODE = "1021"

export function isPayInEvidenceUploaded(
  evidence: Pick<PayInEvidenceRecord, "status"> | null | undefined
): boolean {
  return evidence?.status === PaymentEvidenceStatus.UPLOADED
}

function buildColPayInEvidenceDownloadPath(collectorReportId: string): string {
  return buildDocumentArchiveByDocumentDownloadPath(
    "COL",
    collectorReportId,
    "BANK_PAY_IN_SLIP"
  )
}

export function buildPayInEvidenceSummary(input: {
  evidence: PayInEvidenceRecord | null
  depositPosted: boolean
  archiveAvailable?: boolean | null
  collectorReportId?: string
}): PayInEvidenceSummary {
  const evidence = input.evidence
  const vaultReady = input.archiveAvailable === true
  const legacyUploaded = isPayInEvidenceUploaded(evidence)
  const uploaded = vaultReady || legacyUploaded
  const payInSlipMissingWarning = input.depositPosted && !uploaded
  const collectorReportId = String(input.collectorReportId ?? evidence?.collectorReportId ?? "").trim()

  const payInEvidenceUrl = vaultReady
    ? collectorReportId
      ? buildColPayInEvidenceDownloadPath(collectorReportId)
      : null
    : legacyUploaded
      ? evidence?.blobUrl ?? null
      : null

  return {
    payInEvidenceId: evidence?.id ?? null,
    payInEvidenceStatus: uploaded ? PaymentEvidenceStatus.UPLOADED : evidence?.status ?? null,
    payInEvidenceUrl,
    payInSlipMissingWarning,
    bankDepositDate: evidence?.bankDepositDate
      ? evidence.bankDepositDate.toISOString().slice(0, 10)
      : null,
    bankAccountCode: evidence?.bankAccountCode ?? null,
    archiveAvailable: input.archiveAvailable ?? null,
    payInEvidenceDownloadPath:
      input.archiveAvailable === true && collectorReportId
        ? buildColPayInEvidenceDownloadPath(collectorReportId)
        : null,
  }
}

export async function getPayInEvidenceByCollectorReportId(
  db: PayInEvidenceDb,
  collectorReportId: string
): Promise<PayInEvidenceRecord | null> {
  const id = String(collectorReportId ?? "").trim()
  if (!id) return null

  return db.posPayInEvidence.findUnique({
    where: { collectorReportId: id },
  })
}

export async function ensurePayInEvidenceRow(
  db: PayInEvidenceDb,
  input: {
    collectorReportId: string
    collectNo: string
    branchId: string
  }
): Promise<PayInEvidenceRecord> {
  const collectorReportId = String(input.collectorReportId ?? "").trim()
  const collectNo = String(input.collectNo ?? "").trim()
  const branchId = String(input.branchId ?? "").trim()

  if (!collectorReportId || !collectNo || !branchId) {
    throw new PosSettlementError(
      "collectorReportId, collectNo, and branchId are required",
      PosSettlementErrorCodes.INVALID_SOURCE,
      400
    )
  }

  const existing = await db.posPayInEvidence.findUnique({
    where: { collectorReportId },
  })
  if (existing) return existing

  return db.posPayInEvidence.create({
    data: {
      collectorReportId,
      collectNo,
      branchId,
      status: PaymentEvidenceStatus.PENDING,
      bankAccountCode: DEFAULT_BANK_ACCOUNT_CODE,
    },
  })
}

export async function assertPayInEvidenceUploadedForPosting(
  db: PayInEvidenceDb & PayInEvidenceVaultDb,
  collectorReportId: string,
  input?: {
    collectNo?: string
    pickupStatus?: string
    depositStatus?: string
  }
): Promise<PayInEvidenceRecord> {
  const evidence = await getPayInEvidenceByCollectorReportId(db, collectorReportId)

  if (input?.collectNo && input.pickupStatus && input.depositStatus) {
    await assertPayInVaultEvidenceForPosting(db, {
      collectorReportId,
      collectNo: input.collectNo,
      pickupStatus: input.pickupStatus,
      depositStatus: input.depositStatus,
      legacyEvidence: evidence,
    })
    if (evidence) return evidence
    throw new PosSettlementError(
      "PAY-IN slip evidence is required before bank deposit posting",
      PosSettlementErrorCodes.PAY_IN_SLIP_REQUIRED,
      409
    )
  }

  if (!isPayInEvidenceReadyForPosting({ archiveAvailable: null, legacyEvidence: evidence })) {
    throw new PosSettlementError(
      "PAY-IN slip evidence is required before bank deposit posting",
      PosSettlementErrorCodes.PAY_IN_SLIP_REQUIRED,
      409
    )
  }
  return evidence!
}

export async function markPayInEvidenceUploaded(
  db: PayInEvidenceDb,
  input: {
    evidenceId: string
    blobPathname: string
    blobUrl: string
    byteSize: number
    mimeType: string
    originalFilename?: string | null
    uploadedByStaffId?: string | null
  }
): Promise<PayInEvidenceRecord> {
  return db.posPayInEvidence.update({
    where: { id: input.evidenceId },
    data: {
      status: PaymentEvidenceStatus.UPLOADED,
      blobPathname: input.blobPathname,
      blobUrl: input.blobUrl,
      byteSize: input.byteSize,
      mimeType: input.mimeType,
      originalFilename: input.originalFilename?.trim() || null,
      uploadedAt: new Date(),
      uploadedByStaffId: input.uploadedByStaffId?.trim() || null,
    },
  })
}

export async function updatePayInEvidenceDepositMeta(
  db: PayInEvidenceDb,
  input: {
    evidenceId: string
    bankDepositDate: Date
    bankAccountCode?: string
    bankDepositVoucherId?: string | null
  }
): Promise<PayInEvidenceRecord> {
  return db.posPayInEvidence.update({
    where: { id: input.evidenceId },
    data: {
      bankDepositDate: input.bankDepositDate,
      bankAccountCode: input.bankAccountCode?.trim() || DEFAULT_BANK_ACCOUNT_CODE,
      bankDepositVoucherId: input.bankDepositVoucherId ?? undefined,
    },
  })
}

export { DEFAULT_BANK_ACCOUNT_CODE }
