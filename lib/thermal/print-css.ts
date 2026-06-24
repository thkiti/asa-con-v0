import { THERMAL_COLUMNS } from "./format"
import {
  THERMAL_PAPER_WIDTH_CSS,
  THERMAL_PRINTABLE_WIDTH_CSS,
  THERMAL_PAPER_SIDE_INSET_CSS,
  THERMAL_PAPER_CSS_VAR,
  THERMAL_PRINTABLE_CSS_VAR,
  THERMAL_PAPER_PADDING_CSS_VAR,
  THERMAL_PRINT_SCALE,
  THERMAL_PRINT_SCALE_CSS_VAR,
  THERMAL_PRINT_SCALED_PAPER_WIDTH_CSS,
} from "./thermal-paper"

export const THERMAL_SLIP_CLASS = "thermal-slip"
export const THERMAL_SLIP_LEGACY_CLASS = "pos-receipt-slip"
export const THERMAL_SLIP_CH_VAR = "--thermal-slip-ch-width"
export const THERMAL_SLIP_CH_VAR_LEGACY = "--receipt-slip-ch-width"

/** Attribute on the print wrapper that sizes the scaled clone. */
export const THERMAL_PRINT_CLONE_WRAP_ATTR = "data-thermal-print-clone-wrap"

/** Monospace column width for thermal print builders (unchanged). */
export function thermalSlipChWidth(): string {
  return `${THERMAL_COLUMNS}ch`
}

/** Printable content width for admin preview + clone print. */
export function thermalPrintableWidthCss(): string {
  return THERMAL_PRINTABLE_WIDTH_CSS
}

/** Offscreen host for print source — never use display:none (content must stay in DOM). */
export const THERMAL_PRINT_SOURCE_HOST_CLASS = "thermal-print-source-host"

/** Selector for the printable slip node inside a thermal print source. */
export const THERMAL_PRINT_SLIP_SELECTOR =
  ".receipt-setup-preview-slip, .thermal-ticket-slip, pre.thermal-slip, pre.pos-receipt-slip"

/**
 * Print clone paper box — must match `.receipt-setup-preview-slip` in globals.css:
 * 80mm border-box, 4mm padding, 72mm printable inner.
 */
export const THERMAL_PRINT_CLONE_PAPER_VARS = `
  ${THERMAL_PAPER_CSS_VAR}: ${THERMAL_PAPER_WIDTH_CSS};
  ${THERMAL_PRINTABLE_CSS_VAR}: ${THERMAL_PRINTABLE_WIDTH_CSS};
  ${THERMAL_PAPER_PADDING_CSS_VAR}: ${THERMAL_PAPER_SIDE_INSET_CSS};
  ${THERMAL_PRINT_SCALE_CSS_VAR}: ${THERMAL_PRINT_SCALE};
`

/** Injected print styles for in-panel thermal clone printing. */
export const THERMAL_CLONE_PRINT_STYLES = `
.${THERMAL_PRINT_SOURCE_HOST_CLASS} {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  pointer-events: none;
}

body.thermal-clone-print-active [${THERMAL_PRINT_CLONE_WRAP_ATTR}] {
  position: fixed;
  left: -10000px;
  top: 0;
  z-index: -1;
  opacity: 0;
  pointer-events: none;
  overflow: visible;
}

@media print {
  @page {
    size: ${THERMAL_PAPER_WIDTH_CSS} auto;
    margin: 0;
  }

  body.thermal-clone-print-active {
    background: white !important;
  }

  body.thermal-clone-print-active > *:not([${THERMAL_PRINT_CLONE_WRAP_ATTR}]) {
    display: none !important;
  }

  body.thermal-clone-print-active [${THERMAL_PRINT_CLONE_WRAP_ATTR}] {
    display: block !important;
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    z-index: 2147483647 !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    box-sizing: border-box !important;
    width: ${THERMAL_PRINT_SCALED_PAPER_WIDTH_CSS} !important;
    max-width: ${THERMAL_PRINT_SCALED_PAPER_WIDTH_CSS} !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: transparent !important;
  }

  body.thermal-clone-print-active [data-thermal-print-clone] {
    display: block !important;
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    box-sizing: border-box !important;
    width: ${THERMAL_PAPER_WIDTH_CSS} !important;
    max-width: ${THERMAL_PAPER_WIDTH_CSS} !important;
    min-width: ${THERMAL_PAPER_WIDTH_CSS} !important;
    padding: ${THERMAL_PAPER_SIDE_INSET_CSS} !important;
    margin: 0 !important;
    ${THERMAL_PRINT_CLONE_PAPER_VARS}
    border: none !important;
    border-radius: 0 !important;
    background: white !important;
    color: #111 !important;
    overflow: visible !important;
    transform: scale(${THERMAL_PRINT_SCALE}) !important;
    transform-origin: top left !important;
    zoom: 1 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body.thermal-clone-print-active [data-thermal-print-clone] .receipt-setup-printable-inner {
    display: block !important;
    width: 100% !important;
    max-width: ${THERMAL_PRINTABLE_WIDTH_CSS} !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
    overflow: visible !important;
  }

  body.thermal-clone-print-active [data-thermal-print-clone] .receipt-slip-proportional,
  body.thermal-clone-print-active [data-thermal-print-clone] .receipt-slip-block-text {
    font-family: "THSarabunNew", "Noto Sans Thai", "Leelawadee UI", sans-serif !important;
    font-synthesis: none !important;
  }

  body.thermal-clone-print-active [data-thermal-print-clone] .receipt-setup-mono-body,
  body.thermal-clone-print-active [data-thermal-print-clone] .receipt-slip-mono-line,
  body.thermal-clone-print-active [data-thermal-print-clone] pre.thermal-slip {
    font-family: "Courier New", Courier, monospace !important;
    font-size: 12px !important;
    font-weight: bold !important;
    line-height: 1.25 !important;
    white-space: pre-wrap !important;
  }

  body.thermal-clone-print-active [data-thermal-print-clone] pre.thermal-slip,
  body.thermal-clone-print-active [data-thermal-print-clone] pre.pos-receipt-slip {
    white-space: pre !important;
    width: var(--thermal-slip-ch-width, var(--receipt-slip-ch-width, 30ch)) !important;
    max-width: var(--thermal-slip-ch-width, var(--receipt-slip-ch-width, 30ch)) !important;
    min-width: 0 !important;
    padding: 0 !important;
    box-sizing: content-box !important;
  }

  body.thermal-clone-print-active [data-thermal-print-clone] .receipt-slip-ref-staff-row,
  body.thermal-clone-print-active [data-thermal-print-clone] .receipt-setup-mono-amount-row {
    display: flex !important;
  }

  body.thermal-clone-print-active .no-print {
    display: none !important;
  }
}
`

/** @deprecated Use THERMAL_CLONE_PRINT_STYLES */
export const COLLECTOR_TICKET_PRINT_STYLES = THERMAL_CLONE_PRINT_STYLES
