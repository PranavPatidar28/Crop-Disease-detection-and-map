import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, ProcessingStatus, type Report, Severity } from '@prisma/client';

import { NotificationsFanoutService } from '@/modules/notifications/notifications.fanout.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RealtimeService } from '@/modules/realtime/realtime.service';

import { AiService } from '../ai/ai.service';
import { OutbreakProcessor } from '../outbreak/outbreak.processor';

const SWEEPER_STUCK_MINUTES = 5;

/**
 * Encapsulates the "run AI on a report and persist diagnosis" workflow.
 * Runs detached from the request lifecycle so a 25s upstream call doesn't
 * block the HTTP response. Delegates outbreak detection to `OutbreakProcessor`.
 *
 * On boot (`OnModuleInit`), runs a sweeper that resets PROCESSING rows older
 * than 5 minutes back to PENDING — protects against process crashes mid-AI.
 */
@Injectable()
export class ReportsProcessor implements OnModuleInit {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly realtime: RealtimeService,
    private readonly outbreak: OutbreakProcessor,
    private readonly fanout: NotificationsFanoutService,
  ) {}

  async onModuleInit(): Promise<void> {
    const cutoff = new Date(Date.now() - SWEEPER_STUCK_MINUTES * 60_000);
    const stuck = await this.prisma.report.findMany({
      where: {
        processingStatus: ProcessingStatus.PROCESSING,
        updatedAt: { lt: cutoff },
      },
    });
    if (stuck.length === 0) return;

    // Reset to PENDING and actually re-run analysis — otherwise a report that
    // crashed mid-AI would sit in PENDING forever until a manual reprocess.
    await this.prisma.report.updateMany({
      where: { id: { in: stuck.map((r) => r.id) } },
      data: { processingStatus: ProcessingStatus.PENDING },
    });
    this.logger.warn(`Sweeper re-queueing ${stuck.length} stuck PROCESSING report(s)`);
    for (const report of stuck) {
      this.schedule({ ...report, processingStatus: ProcessingStatus.PENDING });
    }
  }

  /**
   * Fire-and-forget. Caller does NOT await this. Errors are caught + persisted.
   */
  schedule(report: Report): void {
    void this.run(report).catch((err) => {
      this.logger.error(`Unhandled processor error for report ${report.id}`, err as Error);
    });
  }

  private async run(report: Report): Promise<void> {
    try {
      await this.prisma.report.update({
        where: { id: report.id },
        data: { processingStatus: ProcessingStatus.PROCESSING },
      });

      const result = await this.ai.analyze({
        imageUrl: report.imageUrl,
        cropType: report.cropType,
        notes: report.notes ?? undefined,
      });

      if (result.ok) {
        const updated = await this.prisma.report.update({
          where: { id: report.id },
          data: {
            disease: result.disease,
            confidence: result.confidence,
            severity: result.severity,
            recommendations: result.recommendations,
            // Backfill the crop from the model when the farmer left it blank or
            // generic. Never clobber a crop the farmer explicitly chose.
            ...(result.detectedCrop && isGenericCrop(report.cropType)
              ? { cropType: result.detectedCrop }
              : {}),
            advisory: result.advisory
              ? (result.advisory as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            processingStatus: ProcessingStatus.SUCCESS,
            aiError: null,
            processedAt: new Date(),
          },
        });
        this.logger.log(`Report ${report.id} → ${result.disease} (${result.confidence}%)`);
        this.fanOut(updated);
      } else {
        await this.prisma.report.update({
          where: { id: report.id },
          data: {
            processingStatus: ProcessingStatus.FAILED,
            aiError: `${result.errorCode}: ${result.error}`,
            processedAt: new Date(),
          },
        });
        this.logger.warn(`Report ${report.id} → AI failed (${result.errorCode})`);
      }
    } catch (err) {
      // An unexpected throw (e.g. a Prisma write failing) would otherwise leave
      // the row stuck in PROCESSING/PENDING forever. Best-effort persist FAILED
      // so the user lands on a valid result screen with a retry CTA.
      this.logger.error(`Unexpected processor failure for report ${report.id}`, err as Error);
      await this.prisma.report
        .update({
          where: { id: report.id },
          data: {
            processingStatus: ProcessingStatus.FAILED,
            aiError: 'PROCESSOR_ERROR: analysis could not be completed',
            processedAt: new Date(),
          },
        })
        .catch((persistErr) => {
          this.logger.error(
            `Failed to persist FAILED state for report ${report.id}`,
            persistErr as Error,
          );
        });
    }
  }

  /**
   * Side-effects shared by both the HF success path and the trusted-cloud path:
   * realtime broadcast, outbreak detection, and high-severity notification
   * fanout. All best-effort; failures are logged, never thrown.
   */
  private fanOut(report: Report): void {
    try {
      this.realtime.reportCreated(report);
    } catch (err) {
      this.logger.warn(
        `Realtime broadcast failed for report ${report.id}: ${(err as Error).message}`,
      );
    }
    void this.outbreak.handleNewReport(report).catch((err) => {
      this.logger.error('Outbreak processing failed', err as Error);
    });
    if (report.severity === Severity.HIGH) {
      void this.fanout.handleHighSeverityReport(report).catch((err) => {
        this.logger.warn(`High-severity report fanout failed: ${(err as Error).message}`);
      });
    }
  }

  /**
   * A report created with a trusted `cloud` diagnosis is already SUCCESS — HF
   * ran on the client's behalf via /diseases/analyze. Skip re-running HF and
   * just fan out. Fire-and-forget so the HTTP response isn't blocked.
   */
  handleClientDiagnosis(report: Report): void {
    this.fanOut(report);
  }
}

/**
 * Whether a farmer-supplied crop is generic enough that the model's detected
 * crop should win. Only backfill when the farmer never really chose a crop.
 */
function isGenericCrop(cropType: string | null | undefined): boolean {
  if (!cropType) return true;
  const normalized = cropType.trim().toLowerCase();
  return normalized === '' || normalized === 'unknown' || normalized === 'other';
}
