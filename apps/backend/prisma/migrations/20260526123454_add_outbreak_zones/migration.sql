-- CreateTable
CREATE TABLE "OutbreakZone" (
    "id" TEXT NOT NULL,
    "disease" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 5000,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "severity" "Severity" NOT NULL DEFAULT 'LOW',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutbreakZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutbreakZone_centerLat_centerLng_idx" ON "OutbreakZone"("centerLat", "centerLng");

-- CreateIndex
CREATE INDEX "OutbreakZone_disease_lastSeenAt_idx" ON "OutbreakZone"("disease", "lastSeenAt");
