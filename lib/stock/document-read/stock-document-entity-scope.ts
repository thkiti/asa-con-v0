import "server-only"

import type { DocType, Prisma, PrismaClient } from "@/generated/prisma/client"
import {
  HO_BRANCH_CODE,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import { DocumentError, DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import {
  getAllowedDocTypesForEntity,
  isDocumentEntityCode,
  isStockDocumentTypeAllowedForEntity,
} from "./stock-document-entity-policy"

export async function resolveHoBranchId(
  db: Pick<PrismaClient, "branch">
): Promise<{ id: string; code: string; type: string }> {
  const ho = await db.branch.findFirst({
    where: {
      OR: [{ code: HO_BRANCH_CODE }, { type: "HO" }],
      deleted: false,
      isActive: true,
    },
    select: { id: true, code: true, type: true },
  })
  if (!ho) {
    throw new DocumentError(
      "HO999 branch not found",
      DocumentErrorCodes.DOCUMENT_NOT_FOUND,
      404
    )
  }
  return ho
}

export async function assertStockDocumentEntityBranchScope(
  db: Pick<PrismaClient, "branch">,
  input: {
    legalEntityCode: string
    branchId: string
    forEnd?: boolean
  }
): Promise<{
  legalEntityCode: DocumentEntityCode
  branch: { id: string; code: string; type: string }
}> {
  const legalEntityCode = String(input.legalEntityCode ?? "")
    .trim()
    .toUpperCase()
  if (!isDocumentEntityCode(legalEntityCode)) {
    throw new DocumentError(
      "Invalid legalEntityCode",
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
      400
    )
  }

  const branch = await db.branch.findUnique({
    where: { id: String(input.branchId ?? "").trim() },
    select: { id: true, code: true, type: true, deleted: true, isActive: true },
  })
  if (!branch || branch.deleted || !branch.isActive) {
    throw new DocumentError(
      "Branch not found",
      DocumentErrorCodes.DOCUMENT_NOT_FOUND,
      404
    )
  }

  const code = branch.code.trim().toUpperCase()
  if (legalEntityCode === "AD") {
    if (code !== HO_BRANCH_CODE && branch.type !== "HO") {
      throw new DocumentError(
        "ASAD Stock Documents only allow location HO999",
        DocumentErrorCodes.INVALID_TRANSFER_ROUTE,
        400
      )
    }
  } else {
    if (code === HO_BRANCH_CODE || branch.type === "HO") {
      throw new DocumentError(
        "ASAS Stock Documents require a Shop (SHxxx), not HO999",
        DocumentErrorCodes.INVALID_TRANSFER_ROUTE,
        400
      )
    }
    if (input.forEnd && !branch.id) {
      throw new DocumentError(
        "ASAS END requires a specific Shop",
        DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
        400
      )
    }
  }

  return { legalEntityCode, branch }
}

export function assertDocTypeAllowedForEntity(
  legalEntityCode: DocumentEntityCode,
  docType: DocType
): void {
  if (!isStockDocumentTypeAllowedForEntity(legalEntityCode, docType)) {
    throw new DocumentError(
      `Document type ${docType} is not allowed for ${legalEntityCode === "AD" ? "ASAD" : "ASAS"}`,
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
      400
    )
  }
}

/**
 * Build Prisma where for entity-scoped stock document list.
 * ASAD: HO inventory docs only (CNT/ADJ at HO, DEY leaving HO, END at AD+HO).
 * ASAS: Shop docs; excludes ASAD DEY (TRANSFER_OUT from HO).
 */
export function buildEntityScopedListWhere(input: {
  legalEntityCode: DocumentEntityCode
  hoBranchId: string
  /** Specific shop/HO branch id, or null for ASAS All Shops. */
  branchId: string | null
  docType?: DocType
  allowedDocTypes: readonly DocType[]
}): Prisma.StockDocumentWhereInput {
  const { legalEntityCode, hoBranchId, branchId, docType, allowedDocTypes } =
    input

  const typeFilter: Prisma.StockDocumentWhereInput = docType
    ? { docType }
    : { docType: { in: [...allowedDocTypes] } }

  if (legalEntityCode === "AD") {
    const hoId = branchId ?? hoBranchId
    const asadScopes: Prisma.StockDocumentWhereInput[] = [
      {
        docType: "END",
        legalEntityCode: "AD",
        branchId: hoId,
      },
      {
        docType: "ADJUSTMENT",
        OR: [{ branchId: hoId }, { fromLocId: hoId }],
      },
      {
        docType: "TRANSFER_OUT",
        fromLocId: hoId,
      },
    ]

    if (docType === "END") {
      return {
        AND: [typeFilter, { legalEntityCode: "AD", branchId: hoId }],
      }
    }
    if (docType === "ADJUSTMENT") {
      return {
        AND: [
          typeFilter,
          { OR: [{ branchId: hoId }, { fromLocId: hoId }] },
        ],
      }
    }
    if (docType === "TRANSFER_OUT") {
      return {
        AND: [typeFilter, { fromLocId: hoId }],
      }
    }
    return {
      AND: [typeFilter, { OR: asadScopes }],
    }
  }

  // ASAS
  const shopClause = (shopId: string): Prisma.StockDocumentWhereInput => ({
    OR: [
      {
        docType: "END",
        legalEntityCode: "AS",
        branchId: shopId,
      },
      {
        docType: "ADJUSTMENT",
        OR: [{ branchId: shopId }, { fromLocId: shopId }],
      },
      {
        docType: "PERFORMANCE",
        OR: [{ branchId: shopId }, { fromLocId: shopId }],
      },
      {
        // ORD — shop-owned transfer out (not ASAD DEY from HO)
        docType: "TRANSFER_OUT",
        fromLocId: shopId,
        NOT: { fromLocId: hoBranchId },
      },
    ],
  })

  if (branchId) {
    if (docType === "TRANSFER_OUT") {
      return {
        AND: [
          typeFilter,
          { fromLocId: branchId },
          { NOT: { fromLocId: hoBranchId } },
        ],
      }
    }
    if (docType === "END") {
      return {
        AND: [typeFilter, { legalEntityCode: "AS", branchId }],
      }
    }
    return {
      AND: [typeFilter, shopClause(branchId)],
    }
  }

  // All Shops — SH-owned docs only
  return {
    AND: [
      typeFilter,
      {
        OR: [
          { docType: "END", legalEntityCode: "AS" },
          {
            docType: "ADJUSTMENT",
            NOT: {
              OR: [{ branchId: hoBranchId }, { fromLocId: hoBranchId }],
            },
          },
          {
            docType: "PERFORMANCE",
            NOT: {
              OR: [{ branchId: hoBranchId }, { fromLocId: hoBranchId }],
            },
          },
          {
            docType: "TRANSFER_OUT",
            NOT: { fromLocId: hoBranchId },
          },
        ],
      },
    ],
  }
}

export function resolveListAllowedDocTypes(
  legalEntityCode: DocumentEntityCode,
  roleDocTypes: readonly DocType[] | undefined,
  requestedDocType?: DocType
): readonly DocType[] {
  const entityTypes = getAllowedDocTypesForEntity(legalEntityCode)
  const roleSet = roleDocTypes ? new Set(roleDocTypes) : null
  const allowed = entityTypes.filter((t) => (roleSet ? roleSet.has(t) : true))
  if (requestedDocType) {
    if (!allowed.includes(requestedDocType)) {
      throw new DocumentError(
        `Document type ${requestedDocType} is not allowed for this entity`,
        DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
        400
      )
    }
    return [requestedDocType]
  }
  return allowed
}
