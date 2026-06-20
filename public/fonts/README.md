# Bundled fonts for finance print and PDF generation

## THSarabunNew.ttf (standard)

Required for **finance voucher print** (browser print / Save as PDF) and server-side MJV PDF snapshots (PDFKit).

- Standard finance print font per `docs/FINANCE_MJV_PRINT_ARCHITECTURE.md`
- Local dev fallback: `C:\ASA-CON\fonts\THSarabunNew.ttf`
- Do not remove; production and local PDF generation read this file from `public/fonts/` at runtime

## NotoSansThai-Regular.ttf (legacy)

Retained temporarily for backward compatibility. New finance print work uses THSarabunNew only.
Source: [googlefonts/noto-fonts](https://github.com/googlefonts/noto-fonts) — `hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf` (OFL-1.1).
