import type { DocStatus, DocType } from "@/generated/prisma/client"
import { DocumentPolicyError } from "./document-errors"
import type {
  DocumentWorkflowAction,
  TransitionContext,
  VoidResolution,
} from "./document-types"

export const POSTABLE_BY_DOC_TYPE: Record<DocType, ReadonlySet<DocStatus>> = {
  TRANSFER_OUT: new Set(["SUBMITTED", "CONFIRMED"]),
  PERFORMANCE: new Set(["SUBMITTED", "CONFIRMED"]),
  ADJUSTMENT: new Set(["SUBMITTED", "CONFIRMED"]),
  PURCHASE: new Set(["SUBMITTED", "CONFIRMED", "RECEIVED"]),
  TRANSFER_IN: new Set(["SUBMITTED", "CONFIRMED", "RECEIVED"]),
  /** END is never postable — lock via endStatus, not postDocument. */
  END: new Set(),
}

const TERMINAL_STATUSES: ReadonlySet<DocStatus> = new Set(["POSTED", "CANCELLED"])

const CANCELLABLE_STATUSES: ReadonlySet<DocStatus> = new Set([
  "SUBMITTED",
  "SHIPPED",
  "CONFIRMED",
  "RECEIVED",
  "TRANSFERRED",
])

type TransitionRule = {
  action: DocumentWorkflowAction
  from: DocStatus | readonly DocStatus[]
  to: DocStatus
  docTypes?: readonly DocType[]
}

const WORKFLOW_TRANSITIONS: readonly TransitionRule[] = [
  { action: "SUBMIT", from: "DRAFT", to: "SUBMITTED" },
  {
    action: "SHIP",
    from: "SUBMITTED",
    to: "SHIPPED",
    docTypes: ["TRANSFER_OUT", "PURCHASE", "TRANSFER_IN"],
  },
  { action: "CONFIRM", from: "SUBMITTED", to: "CONFIRMED" },
  {
    action: "CONFIRM",
    from: "SHIPPED",
    to: "CONFIRMED",
    docTypes: ["TRANSFER_OUT", "ADJUSTMENT"],
  },
  {
    action: "RECEIVE",
    from: "SHIPPED",
    to: "RECEIVED",
    docTypes: ["PURCHASE", "TRANSFER_IN"],
  },
  {
    action: "TRANSFER",
    from: "CONFIRMED",
    to: "TRANSFERRED",
    docTypes: ["ADJUSTMENT"],
  },
  {
    action: "CANCEL",
    from: [...CANCELLABLE_STATUSES],
    to: "CANCELLED",
  },
]

export function isTerminalStatus(status: DocStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function isImmutableStatus(status: DocStatus): boolean {
  return isTerminalStatus(status)
}

export function isDraftStatus(status: DocStatus): boolean {
  return status === "DRAFT"
}

export function canMutateLines(status: DocStatus): boolean {
  return status === "DRAFT"
}

export function resolveVoidAction(status: DocStatus): VoidResolution {
  if (status === "DRAFT") return "DELETE"
  if (CANCELLABLE_STATUSES.has(status)) return "CANCEL"
  return "FORBIDDEN"
}

function matchesFrom(ruleFrom: DocStatus | readonly DocStatus[], from: DocStatus): boolean {
  if (typeof ruleFrom === "string") return ruleFrom === from
  return ruleFrom.includes(from)
}

function findWorkflowRule(
  action: DocumentWorkflowAction,
  fromStatus: DocStatus
): TransitionRule | undefined {
  return WORKFLOW_TRANSITIONS.find(
    (rule) => rule.action === action && matchesFrom(rule.from, fromStatus)
  )
}

export function assertTransitionAllowed(ctx: TransitionContext): void {
  const { docType, fromStatus, action } = ctx

  if (isTerminalStatus(fromStatus)) {
    throw new DocumentPolicyError(
      `Cannot transition from terminal status ${fromStatus}`,
      "IMMUTABLE_DOCUMENT"
    )
  }

  if (action === "DELETE_DRAFT") {
    if (fromStatus !== "DRAFT") {
      throw new DocumentPolicyError(
        "DELETE_DRAFT only allowed from DRAFT",
        "INVALID_TRANSITION"
      )
    }
    return
  }

  if (action === "POST") {
    const postable = POSTABLE_BY_DOC_TYPE[docType]
    if (!postable.has(fromStatus)) {
      throw new DocumentPolicyError(
        `Status ${fromStatus} is not postable for ${docType}`,
        "INVALID_TRANSITION"
      )
    }
    return
  }

  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new DocumentPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      "INVALID_TRANSITION"
    )
  }

  if (rule.docTypes && !rule.docTypes.includes(docType)) {
    throw new DocumentPolicyError(
      `Action ${action} not allowed for doc type ${docType} from ${fromStatus}`,
      "INVALID_TRANSITION"
    )
  }
}

export function targetStatusForAction(
  action: DocumentWorkflowAction,
  fromStatus: DocStatus
): DocStatus {
  if (action === "DELETE_DRAFT") {
    throw new DocumentPolicyError("DELETE_DRAFT has no target status")
  }
  if (action === "POST") return "POSTED"
  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new DocumentPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      "INVALID_TRANSITION"
    )
  }
  return rule.to
}
