export type ReconciliationAccountRef = {
  id: string
  code: string
  name: string
}

export type ReconciliationAccountRole = "NONE" | "BANK" | "CASH"

export function formatReconciliationAccountLabel(account: {
  code: string
  name: string
}): string {
  return `${account.code} • ${account.name}`
}

export function isBankReconciliationRole(role: ReconciliationAccountRole): boolean {
  return role === "BANK"
}

export function isCashReconciliationRole(role: ReconciliationAccountRole): boolean {
  return role === "CASH"
}
