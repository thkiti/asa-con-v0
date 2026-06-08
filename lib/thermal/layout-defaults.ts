import type { ThermalDocumentLayoutView, ThermalDocumentType, ThermalLayoutMap } from "./types"

function emptyLayout(documentType: ThermalDocumentType): ThermalDocumentLayoutView {
  return {
    documentType,
    headerLine1: null,
    headerLine2: null,
    headerLine3: null,
    footerLine1: null,
    footerLine2: null,
    footerLine3: null,
    footerLine4: null,
    footerLine5: null,
    showAbbreviatedTaxTitle: true,
    showVatIncludedMessage: true,
  }
}

export const DEFAULT_THERMAL_LAYOUTS: ThermalLayoutMap = {
  RECEIPT: {
    ...emptyLayout("RECEIPT"),
    showAbbreviatedTaxTitle: true,
    showVatIncludedMessage: true,
  },
  REFUND: {
    ...emptyLayout("REFUND"),
    showAbbreviatedTaxTitle: true,
    showVatIncludedMessage: false,
  },
  COLLECTOR: {
    ...emptyLayout("COLLECTOR"),
    headerLine1: "ASA SERVICES",
    headerLine2: "Collector Report",
    showAbbreviatedTaxTitle: false,
    showVatIncludedMessage: false,
  },
  REPAIR_TICKET: {
    ...emptyLayout("REPAIR_TICKET"),
    headerLine1: "REPAIR TICKET",
    headerLine2: "ตั๋วรับซ่อม / ฝากซ่อม",
    headerLine3: "ASA SERVICES",
    showAbbreviatedTaxTitle: false,
    showVatIncludedMessage: false,
  },
  READ_Z: {
    ...emptyLayout("READ_Z"),
    headerLine1: "ASA SERVICES",
    headerLine2: "READ Z",
    headerLine3: "Daily Sales Summary",
    showAbbreviatedTaxTitle: false,
    showVatIncludedMessage: false,
  },
}
