import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ProcessingStatus, type Report, Severity } from '@prisma/client';

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
    const result = await this.prisma.report.updateMany({
      where: {
        processingStatus: ProcessingStatus.PROCESSING,
        updatedAt: { lt: cutoff },
      },
      data: {
        processingStatus: ProcessingStatus.PENDING,
      },
    });
    if (result.count > 0) {
      this.logger.warn(`Sweeper reset ${result.count} stuck PROCESSING reports to PENDING`);
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
          processingStatus: ProcessingStatus.SUCCESS,
          aiError: null,
          processedAt: new Date(),
        },
      });
      this.logger.log(`Report ${report.id} → ${result.disease} (${result.confidence}%)`);

      // Broadcast the report and let the outbreak engine react.
      this.realtime.reportCreated(updated);
      void this.outbreak.handleNewReport(updated).catch((err) => {
        this.logger.error('Outbreak processing failed', err as Error);
      });

      // Notify users with plots near a HIGH-severity report.
      if (updated.severity === Severity.HIGH) {
        void this.fanout.handleHighSeverityReport(updated).catch((err) => {
          this.logger.warn(`High-severity report fanout failed: ${(err as Error).message}`);
        });
      }
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
  }
}
