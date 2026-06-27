-- CreateTable
CREATE TABLE "CollectorReport" (
    "id" TEXT NOT NULL,
    "collectNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "reportJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectorReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectorReport_collectNo_key" ON "CollectorReport"("collectNo");

-- CreateIndex
CREATE INDEX "CollectorReport_branchId_createdAt_idx" ON "CollectorReport"("branchId", "createdAt");

-- AddForeignKey
ALTER TABLE "CollectorReport" ADD CONSTRAINT "CollectorReport_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
