-- Branch receipt contact + tax IDs; singleton receipt print settings
ALTER TABLE "Branch" ADD COLUMN "address" TEXT;
ALTER TABLE "Branch" ADD COLUMN "phone" TEXT;
ALTER TABLE "Branch" ADD COLUMN "taxId" TEXT;

CREATE TABLE "ReceiptPrintSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyDisplayName" TEXT,
    "footerLine1" TEXT,
    "footerLine2" TEXT,
    "footerLine3" TEXT,
    "footerLine4" TEXT,
    "footerLine5" TEXT,
    "showAbbreviatedTaxTitle" BOOLEAN NOT NULL DEFAULT true,
    "showVatIncludedMessage" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptPrintSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ReceiptPrintSettings" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP);
