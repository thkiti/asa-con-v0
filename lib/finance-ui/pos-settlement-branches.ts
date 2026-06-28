export type PosSettlementBranchOption = {
  id: string
  code: string
  name: string
}

export type PosSettlementBranchListResult = {
  items: PosSettlementBranchOption[]
}

export function formatPosSettlementBranchLabel(branch: {
  code: string
  name: string
}): string {
  return `${branch.code} • ${branch.name}`
}

export function fetchPosSettlementBranches(): Promise<PosSettlementBranchListResult> {
  return fetch("/api/finance/pos-settlement/branches").then(async (res) => {
    if (!res.ok) {
      let message = res.statusText || "Request failed"
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) message = body.error
      } catch {
        // keep default
      }
      throw new Error(message)
    }
    return res.json() as Promise<PosSettlementBranchListResult>
  })
}
