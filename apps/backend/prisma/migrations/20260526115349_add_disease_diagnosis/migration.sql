-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "aiError" TEXT,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "disease" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "severity" "Severity";

-- CreateIndex
CREATE INDEX "Report_processingStatus_idx" ON "Report"("processingStatus");
