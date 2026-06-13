import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProcessingStatus, type Report } from '@prisma/client';

import { boundingBox, haversineKm } from '@/common/utils/geo.utils';
import { PrismaService } from '@/modules/prisma/prisma.service';

import { CreateReportDto, ListReportsQueryDto, NearbyReportsQueryDto, ReportScope } from './dto';
import { ReportsProcessor } from './reports.processor';

export interface PaginatedReports {
  items: Report[];
  nextCursor: string | null;
}

/**
 * Coerce an untrusted `advisory.whatToDoNow` value into a clean `string[]` for
 * the Prisma `String[]` column. `advisory` is only `@IsObject`-validated, so a
 * client could send `whatToDoNow` as a non-array or an array with non-string
 * members — passing that straight to Prisma would throw at runtime.
 */
function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Map-safe projection of a Report. `/reports/nearby` returns ALL users' reports
 * (it's the public outbreak map), so we must NOT leak per-farmer PII: `notes`
 * (free text), `userId`, `imagePublicId`, and `aiError` are deliberately omitted.
 */
export type NearbyReport = Pick<
  Report,
  | 'id'
  | 'cropType'
  | 'imageUrl'
  | 'latitude'
  | 'longitude'
  | 'disease'
  | 'confidence'
  | 'severity'
  | 'recommendations'
  | 'processingStatus'
  | 'processedAt'
  | 'createdAt'
  | 'updatedAt'
>;

export interface NearbyReportsResult {
  items: NearbyReport[];
  count: number;
  center: { lat: number; lng: number };
  radiusKm: number;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: ReportsProcessor,
  ) {}

  async create(userId: string, dto: CreateReportDto): Promise<Report> {
    // Idempotency: if the client provided a clientId we've already seen, return
    // the existing report instead of creating a duplicate. Crucial for offline
    // queue retries — the drainer can safely re-POST without producing dupes.
    if (dto.clientId) {
      const existing = await this.prisma.report.findUnique({
        where: { userId_clientId: { userId, clientId: dto.clientId } },
      });
      if (existing) return existing;
    }

    // A trusted cloud diagnosis (already run through HF on the client's behalf
    // via /diseases/analyze) is stored as SUCCESS immediately. on-device/manual
    // diagnoses are provisional: store what we have but leave PENDING so the
    // processor upgrades them via HF.
    const isCloudSuccess = dto.engine === 'cloud' && !!dto.disease && !!dto.severity;

    const report = await this.prisma.report
      .create({
        data: {
          userId,
          clientId: dto.clientId ?? null,
          cropType: dto.cropType,
          imageUrl: dto.imageUrl,
          imagePublicId: dto.imagePublicId,
          notes: dto.notes ?? null,
          latitude: dto.latitude,
          longitude: dto.longitude,
          disease: dto.disease ?? null,
          confidence: dto.confidence ?? null,
          severity: dto.severity ?? null,
          recommendations: isCloudSuccess ? toStringArray(dto.advisory?.whatToDoNow) : [],
          // The double-cast is sound: `advisory` comes from a parsed JSON
          // request body, so its values are inherently JSON-serializable.
          advisory: dto.advisory
            ? (dto.advisory as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          processingStatus: isCloudSuccess ? ProcessingStatus.SUCCESS : ProcessingStatus.PENDING,
          processedAt: isCloudSuccess ? new Date() : null,
        },
      })
      .catch(async (err: unknown) => {
        // Concurrent offline-queue retries with the same (userId, clientId) can
        // both pass the findUnique check above and race into create(). The loser
        // hits the @@unique constraint (P2002) — return the row the winner wrote
        // instead of surfacing a 500.
        if (
          dto.clientId &&
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          const existing = await this.prisma.report.findUnique({
            where: { userId_clientId: { userId, clientId: dto.clientId } },
          });
          if (existing) return existing;
        }
        throw err;
      });

    // Cloud diagnosis: skip HF (already done) but still fan out to outbreak /
    // realtime / notifications. Provisional/pending: schedule the processor,
    // which runs HF (upgrading on-device/manual) then fans out.
    if (report.processingStatus === ProcessingStatus.SUCCESS) {
      this.processor.handleClientDiagnosis(report);
    } else if (report.processingStatus === ProcessingStatus.PENDING) {
      this.processor.schedule(report);
    }

    return report;
  }

  async list(userId: string, query: ListReportsQueryDto): Promise<PaginatedReports> {
    const where: Prisma.ReportWhereInput = query.scope === ReportScope.Mine ? { userId } : {};

    const items = await this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (items.length > query.limit) {
      const overflow = items.pop();
      if (overflow) nextCursor = overflow.id;
    }

    return { items, nextCursor };
  }

  /** Total number of reports submitted by a user. Index-backed via `@@index([userId, createdAt])`. */
  async countForUser(userId: string): Promise<number> {
    return this.prisma.report.count({ where: { userId } });
  }

  async findById(userId: string, id: string): Promise<Report> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.userId !== userId) {
      throw new ForbiddenException('You do not have access to this report');
    }
    return report;
  }

  /** Re-runs AI analysis for a report. Owner only. Refuses while already processing. */
  async reprocess(userId: string, id: string): Promise<Report> {
    const report = await this.findById(userId, id);
    if (report.processingStatus === ProcessingStatus.PROCESSING) {
      throw new ConflictException('Report is already being analyzed');
    }
    const reset = await this.prisma.report.update({
      where: { id },
      data: {
        processingStatus: ProcessingStatus.PENDING,
        aiError: null,
      },
    });
    this.processor.schedule(reset);
    return reset;
  }

  /**
   * Finds reports within a radius of a coordinate. Bounding-box pre-filter
   * via Postgres index, then haversine refinement in memory. Only returns
   * reports with `processingStatus = SUCCESS` so the map only shows analyzed
   * data.
   */
  async findNearby(query: NearbyReportsQueryDto): Promise<NearbyReportsResult> {
    const bbox = boundingBox(query.lat, query.lng, query.radiusKm);
    const where: Prisma.ReportWhereInput = {
      processingStatus: ProcessingStatus.SUCCESS,
      latitude: { gte: bbox.minLat, lte: bbox.maxLat },
      longitude: { gte: bbox.minLng, lte: bbox.maxLng },
      ...(query.disease ? { disease: query.disease } : {}),
      ...(query.cropType ? { cropType: query.cropType } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.since ? { createdAt: { gte: new Date(query.since) } } : {}),
    };

    const candidates = await this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit * 3, 1500),
      // Map-safe projection only — never expose other farmers' notes, userId,
      // imagePublicId, or aiError on the public nearby feed.
      select: {
        id: true,
        cropType: true,
        imageUrl: true,
        latitude: true,
        longitude: true,
        disease: true,
        confidence: true,
        severity: true,
        recommendations: true,
        processingStatus: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const items = candidates
      .filter((r) => haversineKm(query.lat, query.lng, r.latitude, r.longitude) <= query.radiusKm)
      .slice(0, query.limit);

    return {
      items,
      count: items.length,
      center: { lat: query.lat, lng: query.lng },
      radiusKm: query.radiusKm,
    };
  }
}
