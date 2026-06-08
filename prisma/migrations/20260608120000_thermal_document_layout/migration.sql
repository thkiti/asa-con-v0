-- CreateEnum
CREATE TYPE "ThermalDocumentType" AS ENUM ('RECEIPT', 'REFUND', 'COLLECTOR', 'REPAIR_TICKET', 'READ_Z');

-- CreateTable
CREATE TABLE "ThermalDocumentLayout" (
    "documentType" "ThermalDocumentType" NOT NULL,
    "headerLine1" TEXT,
    "headerLine2" TEXT,
    "headerLine3" TEXT,
    "footerLine1" TEXT,
    "footerLine2" TEXT,
    "footerLine3" TEXT,
    "footerLine4" TEXT,
    "footerLine5" TEXT,
    "showAbbreviatedTaxTitle" BOOLEAN NOT NULL DEFAULT true,
    "showVatIncludedMessage" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThermalDocumentLayout_pkey" PRIMARY KEY ("documentType")
);

-- Seed RECEIPT from existing ReceiptPrintSettings (if present)
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "headerLine1",
    "headerLine2",
    "headerLine3",
    "footerLine1",
    "footerLine2",
    "footerLine3",
    "footerLine4",
    "footerLine5",
    "showAbbreviatedTaxTitle",
    "showVatIncludedMessage",
    "updatedAt"
)
SELECT
    'RECEIPT'::"ThermalDocumentType",
    "companyDisplayName",
    NULL,
    NULL,
    "footerLine1",
    "footerLine2",
    "footerLine3",
    "footerLine4",
    "footerLine5",
    "showAbbreviatedTaxTitle",
    "showVatIncludedMessage",
    NOW()
FROM "ReceiptPrintSettings"
WHERE "id" = 'default'
ON CONFLICT ("documentType") DO NOTHING;

-- Default RECEIPT row when settings table is empty
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "showAbbreviatedTaxTitle",
    "showVatIncludedMessage",
    "updatedAt"
)
VALUES ('RECEIPT', true, true, NOW())
ON CONFLICT ("documentType") DO NOTHING;

-- REFUND: empty header/footer — inherits RECEIPT at runtime
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "showAbbreviatedTaxTitle",
    "showVatIncludedMessage",
    "updatedAt"
)
VALUES ('REFUND', true, true, NOW())
ON CONFLICT ("documentType") DO NOTHING;

-- COLLECTOR defaults
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "headerLine1",
    "headerLine2",
    "headerLine3",
    "updatedAt"
)
VALUES ('COLLECTOR', 'ASA SERVICES', 'Collector Report', NULL, NOW())
ON CONFLICT ("documentType") DO NOTHING;

-- REPAIR_TICKET defaults
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "headerLine1",
    "headerLine2",
    "headerLine3",
    "updatedAt"
)
VALUES ('REPAIR_TICKET', 'REPAIR TICKET', 'ตั๋วรับซ่อม / ฝากซ่อม', 'ASA SERVICES', NOW())
ON CONFLICT ("documentType") DO NOTHING;

-- READ_Z defaults
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "headerLine1",
    "headerLine2",
    "headerLine3",
    "updatedAt"
)
VALUES ('READ_Z', 'ASA SERVICES', 'READ Z', 'Daily Sales Summary', NOW())
ON CONFLICT ("documentType") DO NOTHING;
