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

export interface NearbyReportsResult {
  items: Report[];
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

    const report = await this.prisma.report.create({
      data: {
        userId,
        clientId: dto.clientId ?? null,
        cropType: dto.cropType,
        imageUrl: dto.imageUrl,
        imagePublicId: dto.imagePublicId,
        notes: dto.notes ?? null,
        latitude: dto.latitude,
        longitude: dto.longitude,
        processingStatus: ProcessingStatus.PENDING,
      },
    });

    // Fire-and-forget AI processing. Returns immediately so the HTTP request
    // doesn't block on a 25s upstream call.
    this.processor.schedule(report);

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
