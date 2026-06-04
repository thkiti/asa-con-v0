-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('SERVICES', 'OUTSIDERS');

-- CreateEnum
CREATE TYPE "PricingClass" AS ENUM ('MATERIAL', 'MACHINERY', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "RoundingMode" AS ENUM ('TWO_DECIMAL', 'HUNDRED_IF_GT_THRESHOLD');

-- CreateTable
CREATE TABLE "PricingPolicy" (
    "id" TEXT NOT NULL,
    "marketType" "MarketType" NOT NULL,
    "pricingClass" "PricingClass" NOT NULL,
    "markupPercent" DECIMAL(5,4) NOT NULL,
    "roundingMode" "RoundingMode" NOT NULL,
    "threshold" DECIMAL(18,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellingPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellingPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingPolicy_marketType_pricingClass_effectiveTo_idx" ON "PricingPolicy"("marketType", "pricingClass", "effectiveTo");

-- CreateIndex
CREATE INDEX "PricingPolicy_marketType_pricingClass_effectiveFrom_idx" ON "PricingPolicy"("marketType", "pricingClass", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SellingPrice_productId_effectiveTo_idx" ON "SellingPrice"("productId", "effectiveTo");

-- CreateIndex
CREATE INDEX "SellingPrice_productId_effectiveFrom_idx" ON "SellingPrice"("productId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "SellingPrice" ADD CONSTRAINT "SellingPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
