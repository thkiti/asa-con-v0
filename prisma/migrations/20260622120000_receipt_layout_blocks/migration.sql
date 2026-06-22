-- Receipt setup block editor: multi-line header/footer + font size
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "headerBlockText" TEXT;
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "headerFontSize" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "footerBlockText" TEXT;
ALTER TABLE "ThermalDocumentLayout" ADD COLUMN "footerFontSize" TEXT NOT NULL DEFAULT 'normal';
