# Bundled fonts for finance print and PDF generation

## THSarabunNew.ttf (standard)

Required for **finance voucher print** (browser print / Save as PDF) and server-side MJV PDF snapshots (PDFKit).

- Loaded via `next/font/local` (`lib/finance-ui/finance-voucher-local-font.ts`) on `.finance-voucher-print-root`
- CSS fallback `@font-face` in `app/globals.css` (weights 400 + 700)
- Local dev fallback for PDFKit: `C:\ASA-CON\fonts\THSarabunNew.ttf`

## THSarabunNew-Bold.ttf

Bold weight (700) for section titles — paired with regular in `next/font/local`.

## NotoSansThai-Regular.ttf (legacy)

Retained temporarily for backward compatibility. New finance print work uses THSarabunNew only.
Source: [googlefonts/noto-fonts](https://github.com/googlefonts/noto-fonts) — `hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf` (OFL-1.1).
