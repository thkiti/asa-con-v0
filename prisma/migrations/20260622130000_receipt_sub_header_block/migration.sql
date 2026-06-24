-- Sub-header block for Receipt layout (replaces tax-title checkbox UX).
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "subHeaderBlockText" TEXT;
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "subHeaderFontSize" TEXT NOT NULL DEFAULT '12';
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "subHeaderBlockBold" BOOLEAN NOT NULL DEFAULT false;

-- Preserve existing abbreviated tax title as sub-header text for RECEIPT rows.
UPDATE "ThermalDocumentLayout"
SET "subHeaderBlockText" = 'ใบกำกับภาษีอย่างย่อ'
WHERE "documentType" = 'RECEIPT'
  AND "showAbbreviatedTaxTitle" = true
  AND ("subHeaderBlockText" IS NULL OR btrim("subHeaderBlockText") = '');
