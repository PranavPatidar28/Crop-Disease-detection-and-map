-- AlterTable
-- Tracks whether a report has already been counted into an OutbreakZone, so a
-- reprocess (re-running AI on an already-SUCCESS report) cannot double-count it.
ALTER TABLE "Report" ADD COLUMN "outbreakContributed" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing SUCCESS reports have already gone through outbreak
-- detection once, so mark them as contributed to avoid re-counting on any
-- future reprocess.
UPDATE "Report" SET "outbreakContributed" = true WHERE "processingStatus" = 'SUCCESS';
