import localFont from "next/font/local"

/**
 * Self-hosted finance voucher font — loaded by Next.js (not CSS @font-face alone).
 * Apply `.className` on `.finance-voucher-print-root` and `.variable` for --font-finance-voucher.
 */
export const financeVoucherLocalFont = localFont({
  src: [
    {
      path: "../../public/fonts/THSarabunNew.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/THSarabunNew-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-finance-voucher",
  display: "swap",
  fallback: ["Noto Sans Thai", "sans-serif"],
})
