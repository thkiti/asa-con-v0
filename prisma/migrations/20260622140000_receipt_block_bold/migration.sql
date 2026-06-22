-- Receipt block bold toggles (header/footer typography; textarea unchanged)
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "headerBlockBold" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "footerBlockBold" BOOLEAN NOT NULL DEFAULT true;
