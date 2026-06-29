import {
  deriveStockDocumentInquiryPhaseCode,
  matchesStockDocumentInquiryKindFilter,
  stockInquiryKindToWhere,
} from "@/lib/stock/inquiry/stock-document-inquiry-kind-filter"

describe("stock-document-inquiry-kind-filter", () => {
  describe("deriveStockDocumentInquiryPhaseCode", () => {
    it("uses document legal entity as viewer entity", () => {
      expect(
        deriveStockDocumentInquiryPhaseCode({
          docType: "TRANSFER_OUT",
          status: "SUBMITTED",
          legalEntityCode: "AD",
        })
      ).toBe("DEY")
    })
  })

  describe("matchesStockDocumentInquiryKindFilter", () => {
    it("matches CNT only for adjustment drafts", () => {
      expect(
        matchesStockDocumentInquiryKindFilter(
          "CNT",
          "",
          { docType: "ADJUSTMENT", status: "DRAFT", legalEntityCode: "AS" }
        )
      ).toBe(true)
      expect(
        matchesStockDocumentInquiryKindFilter(
          "CNT",
          "",
          { docType: "ADJUSTMENT", status: "SUBMITTED", legalEntityCode: "AS" }
        )
      ).toBe(false)
    })

    it("matches ORS for purchase shipped", () => {
      expect(
        matchesStockDocumentInquiryKindFilter(
          "ORS",
          "",
          { docType: "PURCHASE", status: "SHIPPED", legalEntityCode: "AD" }
        )
      ).toBe(true)
    })
  })

  describe("stockInquiryKindToWhere", () => {
    it("returns impossible match for DEY on AS entity", () => {
      const where = stockInquiryKindToWhere("DEY", "AS")
      expect(where).toEqual({ id: { in: [] } })
    })

    it("maps ORD to transfer out and purchase order statuses", () => {
      const where = stockInquiryKindToWhere("ORD", "AS")
      expect(where).toMatchObject({
        OR: expect.arrayContaining([
          expect.objectContaining({ docType: "TRANSFER_OUT" }),
          expect.objectContaining({ docType: "PURCHASE" }),
        ]),
      })
    })
  })
})
