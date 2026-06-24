-- Info block typography (branch/legal + Ref/Date + Staff rows)
ALTER TABLE "ThermalDocumentLayout"
ADD COLUMN "infoBlockFontSize" TEXT NOT NULL DEFAULT '14',
ADD COLUMN "infoBlockBold" BOOLEAN NOT NULL DEFAULT true;
