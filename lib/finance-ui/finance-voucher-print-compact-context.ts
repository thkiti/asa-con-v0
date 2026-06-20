export type FinanceVoucherPrintCompactLine = {
  label: string
  value: string
}

function normalize(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

/** Supplementary print lines — only when not already shown in the canonical header. */
export function buildFinanceVoucherPrintCompactContextLines(input: {
  headerDescription: string
  reference: string | null
  description: string | null
  remarks: string | null
}): FinanceVoucherPrintCompactLine[] {
  const lines: FinanceVoucherPrintCompactLine[] = []
  const headerDescription = normalize(input.headerDescription)
  const beingDescription = normalize(input.description)
  const reference = normalize(input.reference)
  const remarks = normalize(input.remarks)

  if (reference) {
    lines.push({ label: "Reference", value: reference })
  }

  if (beingDescription && beingDescription !== headerDescription) {
    lines.push({ label: "Description", value: beingDescription })
  }

  if (remarks) {
    lines.push({ label: "Remarks", value: remarks })
  }

  return lines
}
