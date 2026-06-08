import {
  backfillThermalDocumentLayouts,
  verifyThermalDocumentLayoutsSeeded,
} from "@/lib/thermal/backfill-document-layouts"

describe("backfillThermalDocumentLayouts", () => {
  it("creates all five rows and copies RECEIPT from ReceiptPrintSettings", async () => {
    const thermalCreate = jest.fn().mockResolvedValue({})
    const thermalFindUnique = jest.fn().mockResolvedValue(null)
    const thermalUpdate = jest.fn()
    const receiptFindUnique = jest.fn().mockResolvedValue({
      id: "default",
      companyDisplayName: "ASA SERVICES",
      footerLine1: "Thanks",
      footerLine2: null,
      footerLine3: null,
      footerLine4: null,
      footerLine5: null,
      showAbbreviatedTaxTitle: true,
      showVatIncludedMessage: true,
    })
    const thermalFindMany = jest.fn().mockResolvedValue([
      { documentType: "RECEIPT" },
      { documentType: "REFUND" },
      { documentType: "COLLECTOR" },
      { documentType: "REPAIR_TICKET" },
      { documentType: "READ_Z" },
    ])

    const result = await backfillThermalDocumentLayouts({
      receiptPrintSettings: { findUnique: receiptFindUnique },
      thermalDocumentLayout: {
        findUnique: thermalFindUnique,
        create: thermalCreate,
        update: thermalUpdate,
        findMany: thermalFindMany,
      },
    } as never)

    expect(result.ok).toBe(true)
    expect(result.receiptCopiedFromLegacy).toBe(true)
    expect(result.created).toEqual([
      "RECEIPT",
      "REFUND",
      "COLLECTOR",
      "REPAIR_TICKET",
      "READ_Z",
    ])
    expect(thermalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentType: "RECEIPT",
          headerLine1: "ASA SERVICES",
          footerLine1: "Thanks",
        }),
      })
    )
  })

  it("reports missing document types", async () => {
    const result = await verifyThermalDocumentLayoutsSeeded({
      thermalDocumentLayout: {
        findMany: jest.fn().mockResolvedValue([{ documentType: "RECEIPT" }]),
      },
    } as never)

    expect(result.ok).toBe(false)
    expect(result.count).toBe(1)
    expect(result.missing).toEqual([
      "REFUND",
      "COLLECTOR",
      "REPAIR_TICKET",
      "READ_Z",
    ])
  })
})
