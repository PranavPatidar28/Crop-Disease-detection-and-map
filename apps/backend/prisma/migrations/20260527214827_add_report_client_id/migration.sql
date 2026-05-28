-- AlterTable
ALTER TABLE "Report" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Report_userId_clientId_key" ON "Report"("userId", "clientId");