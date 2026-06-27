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
  payeeName?: string | null
  payFromLabel?: string | null
  chequeNo?: string | null
  customerName?: string | null
  dueDate?: string | null
  receivedFromName?: string | null
  receiveToLabel?: string | null
  receiptNo?: string | null
  pettyCashAccountLabel?: string | null
}): FinanceVoucherPrintCompactLine[] {
  const lines: FinanceVoucherPrintCompactLine[] = []
  const headerDescription = normalize(input.headerDescription)
  const beingDescription = normalize(input.description)
  const reference = normalize(input.reference)
  const remarks = normalize(input.remarks)
  const payeeName = normalize(input.payeeName)
  const payFromLabel = normalize(input.payFromLabel)
  const chequeNo = normalize(input.chequeNo)
  const customerName = normalize(input.customerName)
  const dueDate = normalize(input.dueDate)
  const receivedFromName = normalize(input.receivedFromName)
  const receiveToLabel = normalize(input.receiveToLabel)
  const receiptNo = normalize(input.receiptNo)
  const pettyCashAccountLabel = normalize(input.pettyCashAccountLabel)

  if (customerName) {
    lines.push({ label: "Customer", value: customerName })
  }

  if (dueDate) {
    lines.push({ label: "Due date", value: dueDate })
  }

  if (receivedFromName) {
    lines.push({ label: "Received from", value: receivedFromName })
  }

  if (receiveToLabel) {
    lines.push({ label: "Receive to", value: receiveToLabel })
  }

  if (receiptNo) {
    lines.push({ label: "Receipt", value: receiptNo })
  }

  if (pettyCashAccountLabel) {
    lines.push({ label: "Petty cash account", value: pettyCashAccountLabel })
  }

  if (payeeName) {
    lines.push({ label: "Payee", value: payeeName })
  }

  if (payFromLabel) {
    lines.push({ label: "Pay from", value: payFromLabel })
  }

  if (reference) {
    lines.push({ label: "Reference", value: reference })
  }

  if (chequeNo) {
    lines.push({ label: "Cheque", value: chequeNo })
  }

  if (beingDescription && beingDescription !== headerDescription) {
    lines.push({ label: "Description", value: beingDescription })
  }

  if (remarks) {
    lines.push({ label: "Remarks", value: remarks })
  }

  return lines
}
