import type { DocStatus, DocType } from "@/generated/prisma/client"
import {
  canMutateLines,
  isImmutableStatus,
  isTerminalStatus,
  POSTABLE_BY_DOC_TYPE,
  resolveVoidAction,
} from "@/lib/stock/document/document-transition-policy"
import type { Role } from "@/lib/shared"
import { SHOP_STOCK_DOC_TYPES } from "@/lib/stock/document-read/constants"
import type { StockDocumentActionId, StockDocumentActionVM } from "./types"

export type StockDocumentPermissionContext = {
  role: Role
  docType: DocType
  status: DocStatus
}

function isShopDocType(docType: DocType): boolean {
  return (SHOP_STOCK_DOC_TYPES as readonly DocType[]).includes(docType)
}

function canShopPost(role: Role, docType: DocType, status: DocStatus): boolean {
  if (role !== "SH_STAFF" && role !== "HO_OPERATIONS" && role !== "HO_ADMIN" && role !== "HO_FINANCE") {
    return false
  }
  if (!isShopDocType(docType)) return false
  if (isTerminalStatus(status)) return false

  const postable = POSTABLE_BY_DOC_TYPE[docType]
  if (!postable.has(status)) return false

  // Phase 23D lock: TRO post is HO only; PERFORMANCE and ADJ allowed at shop.
  if (docType === "TRANSFER_OUT") {
    return role !== "SH_STAFF"
  }

  return true
}

function buildAction(
  id: StockDocumentActionId,
  label: string,
  visible: boolean,
  enabled: boolean,
  opts?: { destructive?: boolean; primary?: boolean }
): StockDocumentActionVM {
  return {
    id,
    label,
    visible,
    enabled,
    ...opts,
  }
}

/**
 * Pure UI action matrix — server remains authoritative.
 */
export function getStockDocumentActions(
  ctx: StockDocumentPermissionContext
): StockDocumentActionVM[] {
  const { role, docType, status } = ctx
  const shopType = isShopDocType(docType)
  const draft = canMutateLines(status)
  const voidAction = resolveVoidAction(status)

  const actions: StockDocumentActionVM[] = []

  if (shopType || role !== "SH_STAFF") {
    actions.push(
      buildAction("save", "Save", draft, draft, { primary: draft }),
      buildAction(
        "submit",
        "Submit",
        draft,
        draft && status === "DRAFT"
      ),
      buildAction(
        "confirm",
        "Confirm",
        status === "SUBMITTED",
        status === "SUBMITTED"
      ),
      buildAction(
        "cancel",
        "Cancel",
        voidAction === "CANCEL",
        voidAction === "CANCEL",
        { destructive: true }
      ),
      buildAction(
        "deleteDraft",
        "Delete draft",
        voidAction === "DELETE",
        voidAction === "DELETE",
        { destructive: true }
      ),
      buildAction(
        "post",
        "Post",
        !isImmutableStatus(status) && canShopPost(role, docType, status),
        canShopPost(role, docType, status),
        { primary: status === "CONFIRMED" || status === "SUBMITTED" }
      )
    )
  }

  actions.push(buildAction("print", "Print", false, false))

  return actions
}

export const EDITOR_WORKFLOW_ACTION_IDS: readonly StockDocumentActionId[] = [
  "save",
  "submit",
  "confirm",
  "cancel",
]

/**
 * Shop editor toolbar — excludes post, delete, print (Phase 23D-3).
 */
export function getEditorWorkflowActions(
  ctx: StockDocumentPermissionContext,
  opts: { hasDocumentId: boolean }
): StockDocumentActionVM[] {
  return getStockDocumentActions(ctx)
    .filter((action) => EDITOR_WORKFLOW_ACTION_IDS.includes(action.id))
    .map((action) => {
      if (!opts.hasDocumentId && action.id !== "save") {
        return { ...action, enabled: false }
      }
      return action
    })
}
