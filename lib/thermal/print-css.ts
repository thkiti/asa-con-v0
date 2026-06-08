import { THERMAL_COLUMNS } from "./format"

export const THERMAL_SLIP_CLASS = "thermal-slip"
export const THERMAL_SLIP_LEGACY_CLASS = "pos-receipt-slip"
export const THERMAL_SLIP_CH_VAR = "--thermal-slip-ch-width"
export const THERMAL_SLIP_CH_VAR_LEGACY = "--receipt-slip-ch-width"

export function thermalSlipChWidth(): string {
  return `${THERMAL_COLUMNS}ch`
}

/** Injected print styles for in-panel thermal clone printing. */
export const THERMAL_CLONE_PRINT_STYLES = `
@media print {
  body.thermal-clone-print-active {
    background: white !important;
  }

  body.thermal-clone-print-active * {
    display: none !important;
  }

  body.thermal-clone-print-active .thermal-print-area,
  body.thermal-clone-print-active .thermal-print-area * {
    display: block !important;
    visibility: visible !important;
    font-family: "Courier New", Courier, monospace !important;
    font-size: 12px !important;
    font-weight: bold !important;
    line-height: 1.25 !important;
  }

  body.thermal-clone-print-active .thermal-print-area pre {
    white-space: pre !important;
  }

  body.thermal-clone-print-active .thermal-print-area {
    box-sizing: content-box !important;
    position: fixed !important;
    left: 2mm !important;
    top: 0 !important;
    width: var(--thermal-slip-ch-width, 30ch) !important;
    max-width: var(--thermal-slip-ch-width, 30ch) !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    color: #111 !important;
    z-index: 2147483647 !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body.thermal-clone-print-active .thermal-signature-space {
    display: block !important;
    height: 50mm !important;
    min-height: 50mm !important;
  }

  body.thermal-clone-print-active .no-print {
    display: none !important;
  }
}
`

/** @deprecated Use THERMAL_CLONE_PRINT_STYLES */
export const COLLECTOR_TICKET_PRINT_STYLES = THERMAL_CLONE_PRINT_STYLES
