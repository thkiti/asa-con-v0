import {
  deriveBusinessPhaseCode,
  formatBusinessDocumentNumber,
  formatStockDocumentPhaseTitle,
} from "@/lib/stock-ui/business-phase-title"

describe("business-phase-title", () => {
  describe("deriveBusinessPhaseCode", () => {
    it("maps shop TRANSFER_OUT draft to ORD for ASAS viewer", () => {
      expect(
        deriveBusinessPhaseCode({
          docType: "TRANSFER_OUT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        })
      ).toBe("ORD")
    })

    it("maps shop TRANSFER_OUT shipped to ORI for ASAS viewer", () => {
      expect(
        deriveBusinessPhaseCode({
          docType: "TRANSFER_OUT",
          status: "SHIPPED",
          viewerEntityCode: "AS",
        })
      ).toBe("ORI")
    })

    it("maps TRANSFER_OUT submitted to DEY for ASAD viewer", () => {
      expect(
        deriveBusinessPhaseCode({
          docType: "TRANSFER_OUT",
          status: "SUBMITTED",
          viewerEntityCode: "AD",
        })
      ).toBe("DEY")
    })

    it("maps ADJUSTMENT draft to CNT", () => {
      expect(
        deriveBusinessPhaseCode({
          docType: "ADJUSTMENT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        })
      ).toBe("CNT")
    })

    it("maps ADJUSTMENT submitted to ADJ", () => {
      expect(
        deriveBusinessPhaseCode({
          docType: "ADJUSTMENT",
          status: "SUBMITTED",
          viewerEntityCode: "AS",
        })
      ).toBe("ADJ")
    })

    it("maps PURCHASE shipped to ORS for ASAD", () => {
      expect(
        deriveBusinessPhaseCode({
          docType: "PURCHASE",
          status: "SHIPPED",
          viewerEntityCode: "AD",
        })
      ).toBe("ORS")
    })

    it("maps TRANSFER_IN to ORI", () => {
      expect(
        deriveBusinessPhaseCode({
          docType: "TRANSFER_IN",
          status: "DRAFT",
          viewerEntityCode: "AD",
        })
      ).toBe("ORI")
    })
  })

  describe("formatStockDocumentPhaseTitle", () => {
    it("formats ASAS shop order title", () => {
      expect(
        formatStockDocumentPhaseTitle({
          docType: "TRANSFER_OUT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        })
      ).toBe("ASAS • ORD")
    })

    it("formats ASAS count title", () => {
      expect(
        formatStockDocumentPhaseTitle({
          docType: "ADJUSTMENT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        })
      ).toBe("ASAS • CNT")
    })

    it("formats ASAD delivery title", () => {
      expect(
        formatStockDocumentPhaseTitle({
          docType: "TRANSFER_OUT",
          status: "SUBMITTED",
          viewerEntityCode: "AD",
        })
      ).toBe("ASAD • DEY")
    })
  })

  describe("formatBusinessDocumentNumber", () => {
    it("maps ADJ running ref to CNT for count draft", () => {
      expect(
        formatBusinessDocumentNumber({
          docType: "ADJUSTMENT",
          status: "DRAFT",
          viewerEntityCode: "AS",
          storedRefNo: "ADJ-SH001-202606-0001",
        })
      ).toBe("CNT-SH001-202606-0001")
    })

    it("maps TRO running ref to ORD for shop order draft", () => {
      expect(
        formatBusinessDocumentNumber({
          docType: "TRANSFER_OUT",
          status: "DRAFT",
          viewerEntityCode: "AS",
          storedRefNo: "TRO-SH001-202606-0001",
        })
      ).toBe("ORD-SH001-202606-0001")
    })

    it("maps TRO running ref to DEY for ASAD submitted delivery", () => {
      expect(
        formatBusinessDocumentNumber({
          docType: "TRANSFER_OUT",
          status: "SUBMITTED",
          viewerEntityCode: "AD",
          storedRefNo: "TRO-SH001-202606-0001",
        })
      ).toBe("DEY-SH001-202606-0001")
    })

    it("maps PUR running ref to ORS when shipped", () => {
      expect(
        formatBusinessDocumentNumber({
          docType: "PURCHASE",
          status: "SHIPPED",
          viewerEntityCode: "AD",
          storedRefNo: "PUR-SH001-202606-0001",
        })
      ).toBe("ORS-SH001-202606-0001")
    })

    it("maps TRI running ref to ORI", () => {
      expect(
        formatBusinessDocumentNumber({
          docType: "TRANSFER_IN",
          status: "DRAFT",
          viewerEntityCode: "AD",
          storedRefNo: "TRI-SH001-202606-001",
        })
      ).toBe("ORI-SH001-202606-001")
    })

    it("leaves non-running legacy refs unchanged", () => {
      expect(
        formatBusinessDocumentNumber({
          docType: "TRANSFER_OUT",
          status: "DRAFT",
          viewerEntityCode: "AS",
          storedRefNo: "TRO-001",
        })
      ).toBe("TRO-001")
    })

    it("leaves PERFORMANCE refs unchanged", () => {
      expect(
        formatBusinessDocumentNumber({
          docType: "PERFORMANCE",
          status: "DRAFT",
          viewerEntityCode: "AS",
          storedRefNo: "PER-SH001-202606-0001",
        })
      ).toBe("PER-SH001-202606-0001")
    })
  })
})
