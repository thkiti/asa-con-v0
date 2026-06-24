export type SlipIdentityParts = {
  beforeMachineLines: string[]
  machineTaxId: string | null
  afterMachineLines: string[]
}

export function buildSlipIdentityParts(context: {
  branchCode: string
  branchName: string
  branchPhone?: string | null
  machineTaxId?: string | null
  companyTaxId?: string | null
}): SlipIdentityParts {
  const beforeMachineLines: string[] = []
  const afterMachineLines: string[] = []

  beforeMachineLines.push(`${context.branchCode} • ${context.branchName}`)
  if (context.branchPhone?.trim()) {
    beforeMachineLines.push(`Tel. ${context.branchPhone.trim()}`)
  }

  const machineTaxId = context.machineTaxId?.trim() || null

  if (context.companyTaxId) {
    afterMachineLines.push(`Tax ID ${context.companyTaxId}`)
  }

  return { beforeMachineLines, machineTaxId, afterMachineLines }
}
