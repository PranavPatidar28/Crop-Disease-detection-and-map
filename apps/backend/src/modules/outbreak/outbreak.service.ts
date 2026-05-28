import { Injectable, NotFoundException } from '@nestjs/common';
import { type OutbreakZone, Prisma, type Report } from '@prisma/client';

import { PrismaService } from '@/modules/prisma/prisma.service';

import type { ListOutbreaksQueryDto } from './dto';

export interface OutbreakWithReports {
  zone: OutbreakZone;
  contributingReports: Report[];
}

const DEFAULT_SINCE_DAYS = 30;
const CONTRIBUTING_REPORT_LIMIT = 20;
const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  expiresAt: number;
  data: OutbreakZone[];
}

@Injectable()
export class OutbreakService {
  /**
   * In-memory cache for the most common query: `active=true` zones. The map
   * polls this every 60s and the dashboard reads it on every render — caching
   * for 30s keeps Neon happy without compromising freshness (zones change at
   * most once every few minutes via the cron).
   *
   * Cache is invalidated when:
   *   - 30s TTL expires
   *   - any zone is created / updated / resolved (via `invalidate()`)
   */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /** Called from `OutbreakProcessor` after any mutation to drop stale caches. */
  invalidate(): void {
    this.cache.clear();
  }

  async list(query: ListOutbreaksQueryDto): Promise<OutbreakZone[]> {
    const cacheKey = `${query.active ?? 'any'}|${query.disease ?? '*'}|${query.severity ?? '*'}|${query.since ?? ''}|${query.limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const since = query.since
      ? new Date(query.since)
      : new Date(Date.now() - DEFAULT_SINCE_DAYS * 24 * 60 * 60 * 1000);

    const where: Prisma.OutbreakZoneWhereInput = {
      lastSeenAt: { gte: since },
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.disease ? { disease: query.disease } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
    };

    const result = await this.prisma.outbreakZone.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      take: query.limit,
    });

    this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  async findById(id: string): Promise<OutbreakWithReports> {
    const zone = await this.prisma.outbreakZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Outbreak zone not found');

    const contributingReports = await this.findContributingReports(zone);
    return { zone, contributingReports };
  }

  /**
   * Returns the most recent SUCCESS reports of this disease within the zone's
   * radius, ordered by createdAt desc. Used by the detail view.
   */
  async findContributingReports(zone: OutbreakZone): Promise<Report[]> {
    const radiusKm = zone.radius / 1000;
    const dLat = radiusKm / 110.574;
    const dLng = radiusKm / Math.max(0.01, 111.32 * Math.cos((zone.latitude * Math.PI) / 180));

    return this.prisma.report.findMany({
      where: {
        disease: zone.disease,
        processingStatus: 'SUCCESS',
        latitude: { gte: zone.latitude - dLat, lte: zone.latitude + dLat },
        longitude: { gte: zone.longitude - dLng, lte: zone.longitude + dLng },
      },
      orderBy: { createdAt: 'desc' },
      take: CONTRIBUTING_REPORT_LIMIT,
    });
  }
}
