import "server-only"

import type { DocType } from "@/generated/prisma/client"
import type { SessionUser } from "@/lib/auth/types"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import { DocumentError, DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import {
  isHoRole,
  listDocTypesForRole,
  resolveListBranchId,
  StockDocumentAuthError,
} from "./document-access"
import {
  assertStockDocumentEntityBranchScope,
  buildEntityScopedListWhere,
  resolveHoBranchId,
  resolveListAllowedDocTypes,
} from "./stock-document-entity-scope"
import type { PrismaClient } from "@/generated/prisma/client"
import type { Prisma } from "@/generated/prisma/client"

export type ResolvedStockDocumentListScope = {
  legalEntityCode: DocumentEntityCode
  branchId: string | null
  entityWhere: Prisma.StockDocumentWhereInput
}

/**
 * Resolve entity-scoped list filters from session + query.
 * Session documentEntityCode is authoritative (not client-supplied).
 */
export async function resolveStockDocumentListScope(
  db: Pick<PrismaClient, "branch">,
  session: SessionUser,
  input: {
    branchId: string | null
    docType?: DocType
  }
): Promise<ResolvedStockDocumentListScope> {
  const legalEntityCode =
    parseDocumentEntityCode(session.documentEntityCode) ??
    DEFAULT_DOCUMENT_ENTITY_CODE

  const ho = await resolveHoBranchId(db)
  const roleTypes = listDocTypesForRole(session.role)
  const allowed = resolveListAllowedDocTypes(
    legalEntityCode,
    roleTypes,
    input.docType
  )
  const docType =
    input.docType && allowed.includes(input.docType) ? input.docType : undefined

  if (legalEntityCode === "AD") {
    const requested = String(input.branchId ?? "").trim()
    if (requested && requested !== ho.id) {
      await assertStockDocumentEntityBranchScope(db, {
        legalEntityCode: "AD",
        branchId: requested,
      })
    }
    return {
      legalEntityCode,
      branchId: ho.id,
      entityWhere: buildEntityScopedListWhere({
        legalEntityCode: "AD",
        hoBranchId: ho.id,
        branchId: ho.id,
        docType,
        allowedDocTypes: allowed,
      }),
    }
  }

  // ASAS
  if (session.role === "SH_STAFF") {
    const branchId = resolveListBranchId(session, input.branchId)
    await assertStockDocumentEntityBranchScope(db, {
      legalEntityCode: "AS",
      branchId,
    })
    return {
      legalEntityCode,
      branchId,
      entityWhere: buildEntityScopedListWhere({
        legalEntityCode: "AS",
        hoBranchId: ho.id,
        branchId,
        docType,
        allowedDocTypes: allowed,
      }),
    }
  }

  if (!isHoRole(session.role)) {
    throw new StockDocumentAuthError(
      "Permission denied",
      "BRANCH_ACCESS_DENIED",
      403
    )
  }

  const requested = String(input.branchId ?? "").trim()
  if (!requested) {
    // All Shops — do not fall back to session HO999
    return {
      legalEntityCode,
      branchId: null,
      entityWhere: buildEntityScopedListWhere({
        legalEntityCode: "AS",
        hoBranchId: ho.id,
        branchId: null,
        docType,
        allowedDocTypes: allowed,
      }),
    }
  }

  if (requested === ho.id) {
    throw new DocumentError(
      "ASAS Stock Documents require a Shop (SHxxx), not HO999",
      DocumentErrorCodes.INVALID_TRANSFER_ROUTE,
      400
    )
  }

  await assertStockDocumentEntityBranchScope(db, {
    legalEntityCode: "AS",
    branchId: requested,
  })

  return {
    legalEntityCode,
    branchId: requested,
    entityWhere: buildEntityScopedListWhere({
      legalEntityCode: "AS",
      hoBranchId: ho.id,
      branchId: requested,
      docType,
      allowedDocTypes: allowed,
    }),
  }
}

/**
 * Resolve END get-or-create branch.
 * ASAD → HO999 only (missing branch resolves to HO; SHxxx is rejected).
 * ASAS → requires a specific SHxxx (rejects missing / HO999).
 */
export async function resolveEndGetOrCreateBranch(
  db: Pick<PrismaClient, "branch">,
  session: SessionUser,
  input: {
    legalEntityCode?: string | null
    branchId?: string | null
  }
): Promise<{ legalEntityCode: DocumentEntityCode; branchId: string }> {
  const sessionEntity =
    parseDocumentEntityCode(session.documentEntityCode) ??
    DEFAULT_DOCUMENT_ENTITY_CODE
  const requestedEntity = parseDocumentEntityCode(input.legalEntityCode)

  if (requestedEntity && requestedEntity !== sessionEntity) {
    throw new DocumentError(
      "legalEntityCode does not match session entity",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
      400
    )
  }

  const legalEntityCode = sessionEntity
  const requested = String(input.branchId ?? "").trim()
  const ho = await resolveHoBranchId(db)

  if (legalEntityCode === "AD") {
    if (requested && requested !== ho.id) {
      await assertStockDocumentEntityBranchScope(db, {
        legalEntityCode: "AD",
        branchId: requested,
        forEnd: true,
      })
    }
    return { legalEntityCode: "AD", branchId: ho.id }
  }

  if (!requested) {
    throw new DocumentError(
      "ASAS END requires a specific Shop",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
      400
    )
  }

  if (requested === ho.id) {
    throw new DocumentError(
      "ASAS END requires a Shop (SHxxx), not HO999",
      DocumentErrorCodes.INVALID_TRANSFER_ROUTE,
      400
    )
  }

  await assertStockDocumentEntityBranchScope(db, {
    legalEntityCode: "AS",
    branchId: requested,
    forEnd: true,
  })

  return { legalEntityCode: "AS", branchId: requested }
}
