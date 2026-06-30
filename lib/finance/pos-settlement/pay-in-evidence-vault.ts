import type { PrismaClient } from "@/generated/prisma/client"
import { PaymentEvidenceStatus } from "@/generated/prisma/client"
import { buildDocumentArchiveByDocumentDownloadPath } from "@/lib/document-archive-ui/paths"
import { buildDocumentArchiveRefKey } from "@/lib/document-archive/kinds"
import {
  COL_PAY_IN_ARCHIVE_WORKFLOW,
  resolveColPayInArchiveWorkflowStatus,
} from "@/lib/document-archive/col-pay-in-workflow"
import { resolveColBankPayInArchiveAvailable } from "@/lib/document-archive/resolve-col-archive-available"
import { uploadDocumentArchive } from "@/lib/document-archive/upload-archive"
import { loadVaultArchivesForRefs } from "@/lib/document-archive/vault-lookup"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { PayInEvidenceRecord } from "./pay-in-evidence"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

function isLegacyPayInEvidenceUploaded(
  evidence: Pick<PayInEvidenceRecord, "status"> | null | undefined
): boolean {
  return evidence?.status === PaymentEvidenceStatus.UPLOADED
}

export type PayInEvidenceVaultDb = Pick<
  PrismaClient,
  "documentArchive" | "documentArchiveLink" | "$transaction"
>

export type ColPayInArchiveContext = {
  collectorReportId: string
  collectNo: string
  workflowStatus: string
  archiveAvailable: boolean | null
  evidenceDownloadPath: string | null
}

export function buildColPayInEvidenceDownloadPath(collectorReportId: string): string {
  return buildDocumentArchiveByDocumentDownloadPath(
    "COL",
    collectorReportId,
    "BANK_PAY_IN_SLIP"
  )
}

export function isPayInEvidenceReadyForPosting(input: {
  archiveAvailable: boolean | null
  legacyEvidence?: Pick<PayInEvidenceRecord, "status"> | null
}): boolean {
  if (input.archiveAvailable === true) return true
  return isLegacyPayInEvidenceUploaded(input.legacyEvidence)
}

export async function resolveColPayInArchiveContext(
  db: PayInEvidenceVaultDb,
  input: {
    collectorReportId: string
    collectNo: string
    pickupStatus: string
    depositStatus: string
  }
): Promise<ColPayInArchiveContext> {
  const workflowStatus = resolveColPayInArchiveWorkflowStatus({
    pickupStatus: input.pickupStatus,
    depositStatus: input.depositStatus,
  })

  const vaultByKey = await loadVaultArchivesForRefs(db, [
    {
      documentKind: "COL",
      documentId: input.collectorReportId,
      archiveKind: "BANK_PAY_IN_SLIP",
    },
  ])

  const vaultKey = buildDocumentArchiveRefKey(
    "COL",
    input.collectorReportId,
    "BANK_PAY_IN_SLIP"
  )

  const archiveAvailable = resolveColBankPayInArchiveAvailable(
    {
      documentKind: "COL",
      documentId: input.collectorReportId,
      documentNo: input.collectNo,
      archiveKind: "BANK_PAY_IN_SLIP",
      workflowStatus,
    },
    vaultByKey.get(vaultKey)
  )

  return {
    collectorReportId: input.collectorReportId,
    collectNo: input.collectNo,
    workflowStatus,
    archiveAvailable,
    evidenceDownloadPath:
      archiveAvailable === true
        ? buildColPayInEvidenceDownloadPath(input.collectorReportId)
        : null,
  }
}

export async function assertPayInVaultEvidenceForPosting(
  db: PayInEvidenceVaultDb,
  input: {
    collectorReportId: string
    collectNo: string
    pickupStatus: string
    depositStatus: string
    legacyEvidence?: PayInEvidenceRecord | null
  }
): Promise<ColPayInArchiveContext> {
  const context = await resolveColPayInArchiveContext(db, {
    collectorReportId: input.collectorReportId,
    collectNo: input.collectNo,
    pickupStatus: input.pickupStatus,
    depositStatus: input.depositStatus,
  })

  if (
    !isPayInEvidenceReadyForPosting({
      archiveAvailable: context.archiveAvailable,
      legacyEvidence: input.legacyEvidence,
    })
  ) {
    throw new PosSettlementError(
      "PAY-IN slip evidence is required before bank deposit posting",
      PosSettlementErrorCodes.PAY_IN_SLIP_REQUIRED,
      409
    )
  }

  return context
}

export type UploadPayInVaultEvidenceInput = {
  legalEntityCode: DocumentEntityCode
  archivedByStaffId: string
  branchId?: string | null
  fileBuffer: Buffer
  fileName?: string | null
  mimeType?: string | null
  links: Array<{
    collectorReportId: string
    collectNo: string
    branchId: string
  }>
}

export async function uploadPayInVaultEvidence(
  db: PayInEvidenceVaultDb,
  input: UploadPayInVaultEvidenceInput
) {
  if (input.links.length === 0) {
    throw new PosSettlementError(
      "At least one collector report is required",
      PosSettlementErrorCodes.INVALID_SOURCE,
      400
    )
  }

  return uploadDocumentArchive(db, {
    archiveKind: "BANK_PAY_IN_SLIP",
    legalEntityCode: input.legalEntityCode,
    branchId: input.branchId ?? input.links[0]?.branchId ?? null,
    archivedByStaffId: input.archivedByStaffId,
    fileBuffer: input.fileBuffer,
    fileName: input.fileName,
    mimeType: input.mimeType,
    links: input.links.map((link) => ({
      documentKind: "COL",
      documentId: link.collectorReportId,
      documentNo: link.collectNo,
      linkType: "EVIDENCE",
    })),
  })
}

export { COL_PAY_IN_ARCHIVE_WORKFLOW }
