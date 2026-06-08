-- P2B deferred: seed ThermalDocumentLayout (db-push skips prior migration seeds).
-- Idempotent — safe to re-run. Does NOT drop ReceiptPrintSettings.

-- RECEIPT from legacy ReceiptPrintSettings when present
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
ON CONFLICT ("documentType") DO UPDATE SET
    "headerLine1" = COALESCE(EXCLUDED."headerLine1", "ThermalDocumentLayout"."headerLine1"),
    "footerLine1" = COALESCE(EXCLUDED."footerLine1", "ThermalDocumentLayout"."footerLine1"),
    "footerLine2" = COALESCE(EXCLUDED."footerLine2", "ThermalDocumentLayout"."footerLine2"),
    "footerLine3" = COALESCE(EXCLUDED."footerLine3", "ThermalDocumentLayout"."footerLine3"),
    "footerLine4" = COALESCE(EXCLUDED."footerLine4", "ThermalDocumentLayout"."footerLine4"),
    "footerLine5" = COALESCE(EXCLUDED."footerLine5", "ThermalDocumentLayout"."footerLine5"),
    "showAbbreviatedTaxTitle" = EXCLUDED."showAbbreviatedTaxTitle",
    "showVatIncludedMessage" = EXCLUDED."showVatIncludedMessage",
    "updatedAt" = NOW();

-- Default RECEIPT when legacy settings row is absent
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
VALUES ('REFUND', true, false, NOW())
ON CONFLICT ("documentType") DO NOTHING;

-- COLLECTOR defaults
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "headerLine1",
    "headerLine2",
    "showAbbreviatedTaxTitle",
    "showVatIncludedMessage",
    "updatedAt"
)
VALUES ('COLLECTOR', 'ASA SERVICES', 'Collector Report', false, false, NOW())
ON CONFLICT ("documentType") DO NOTHING;

-- REPAIR_TICKET defaults
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "headerLine1",
    "headerLine2",
    "headerLine3",
    "showAbbreviatedTaxTitle",
    "showVatIncludedMessage",
    "updatedAt"
)
VALUES ('REPAIR_TICKET', 'REPAIR TICKET', 'ตั๋วรับซ่อม / ฝากซ่อม', 'ASA SERVICES', false, false, NOW())
ON CONFLICT ("documentType") DO NOTHING;

-- READ_Z defaults
INSERT INTO "ThermalDocumentLayout" (
    "documentType",
    "headerLine1",
    "headerLine2",
    "headerLine3",
    "showAbbreviatedTaxTitle",
    "showVatIncludedMessage",
    "updatedAt"
)
VALUES ('READ_Z', 'ASA SERVICES', 'READ Z', 'Daily Sales Summary', false, false, NOW())
ON CONFLICT ("documentType") DO NOTHING;
