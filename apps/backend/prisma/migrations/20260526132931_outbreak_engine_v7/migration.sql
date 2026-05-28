/*
  Warnings:

  - You are about to drop the column `centerLat` on the `OutbreakZone` table. All the data in the column will be lost.
  - You are about to drop the column `centerLng` on the `OutbreakZone` table. All the data in the column will be lost.
  - You are about to drop the column `firstSeenAt` on the `OutbreakZone` table. All the data in the column will be lost.
  - You are about to drop the column `radiusMeters` on the `OutbreakZone` table. All the data in the column will be lost.
  - Added the required column `latitude` to the `OutbreakZone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `OutbreakZone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `OutbreakZone` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "OutbreakZone_centerLat_centerLng_idx";

-- AlterTable
ALTER TABLE "OutbreakZone" DROP COLUMN "centerLat",
DROP COLUMN "centerLng",
DROP COLUMN "firstSeenAt",
DROP COLUMN "radiusMeters",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "affectedCropTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "radius" DOUBLE PRECISION NOT NULL DEFAULT 3000,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "OutbreakZone_latitude_longitude_idx" ON "OutbreakZone"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "OutbreakZone_active_lastSeenAt_idx" ON "OutbreakZone"("active", "lastSeenAt");
