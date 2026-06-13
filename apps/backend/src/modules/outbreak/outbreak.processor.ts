import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type OutbreakZone, ProcessingStatus, type Report, Severity } from '@prisma/client';

import { boundingBox, haversineKm, rollingCentroid } from '@/common/utils/geo.utils';
import type { Env } from '@/config/env.schema';
import { NotificationsFanoutService } from '@/modules/notifications/notifications.fanout.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RealtimeService } from '@/modules/realtime/realtime.service';

import { OutbreakService } from './outbreak.service';

/**
 * Owns the outbreak lifecycle:
 *   - decides whether a new SUCCESS report should attach to an existing zone,
 *     create a new one, or do nothing yet
 *   - recomputes centroid + severity on each contribution
 *   - emits the right realtime event
 *
 * Rules (env-tunable):
 *   CREATE: ≥ OUTBREAK_CREATE_THRESHOLD same-disease SUCCESS reports within
 *           OUTBREAK_CREATE_RADIUS_KM in the last 24h, no zone matches → create.
 *   UPDATE: report falls within an existing zone's radius → bump.
 *   ESCALATE: zone reportCount ≥ OUTBREAK_ESCALATE_THRESHOLD or geo coverage
 *             expanding past OUTBREAK_ESCALATE_RADIUS_KM bumps severity.
 *   HIGH: zone reportCount ≥ OUTBREAK_HIGH_REPORT_COUNT or
 *         highCount ≥ OUTBREAK_HIGH_SEVERITY_COUNT.
 */
@Injectable()
export class OutbreakProcessor {
  private readonly logger = new Logger(OutbreakProcessor.name);

  private readonly CREATE_THRESHOLD: number;
  private readonly CREATE_RADIUS_KM: number;
  private readonly ESCALATE_THRESHOLD: number;
  private readonly ESCALATE_RADIUS_KM: number;
  private readonly HIGH_REPORT_COUNT: number;
  private readonly HIGH_SEVERITY_COUNT: number;
  private readonly LOOKBACK_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly fanout: NotificationsFanoutService,
    private readonly service: OutbreakService,
    config: ConfigService<Env, true>,
  ) {
    this.CREATE_THRESHOLD = config.get('OUTBREAK_CREATE_THRESHOLD', { infer: true });
    this.CREATE_RADIUS_KM = config.get('OUTBREAK_CREATE_RADIUS_KM', { infer: true });
    this.ESCALATE_THRESHOLD = config.get('OUTBREAK_ESCALATE_THRESHOLD', { infer: true });
    this.ESCALATE_RADIUS_KM = config.get('OUTBREAK_ESCALATE_RADIUS_KM', { infer: true });
    this.HIGH_REPORT_COUNT = config.get('OUTBREAK_HIGH_REPORT_COUNT', { infer: true });
    this.HIGH_SEVERITY_COUNT = config.get('OUTBREAK_HIGH_SEVERITY_COUNT', { infer: true });
  }

  /** Single entry point. Called by ReportsProcessor after AI SUCCESS. */
  async handleNewReport(report: Report): Promise<void> {
    if (!report.disease || !report.severity) return;

    // Idempotency: a report must contribute to a zone at most once. Reprocessing
    // an already-SUCCESS report would otherwise re-run this and double-count it
    // into the zone (inflating reportCount/highCount and skewing escalation).
    if (report.outbreakContributed) return;

    // Serialize all attach/create decisions for the same disease. The processor
    // is fire-and-forget, so two concurrent SUCCESS reports could both observe
    // "no matching zone" and both create overlapping zones, or race on a zone's
    // reportCount (lost update). An in-process per-disease mutex is sufficient
    // for the single-instance deployment; swap for a Postgres advisory lock when
    // running multiple instances.
    await this.runExclusive(report.disease, async () => {
      const matched = await this.findMatchingZone(report);
      if (matched) {
        await this.attachToZone(matched, report);
      } else if (await this.shouldCreateZone(report)) {
        await this.createZone(report);
      } else {
        return; // below threshold — didn't contribute to any zone yet
      }
      // Mark the report as contributed so a later reprocess won't re-count it.
      await this.prisma.report.update({
        where: { id: report.id },
        data: { outbreakContributed: true },
      });
    });
  }

  /** Per-key serialization. Chains async work so same-key calls never overlap. */
  private readonly locks = new Map<string, Promise<unknown>>();

  private async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prior = this.locks.get(key) ?? Promise.resolve();
    const run = prior.then(fn, fn);
    // Store a failure-swallowing version so the next same-key caller chains
    // regardless of this run's outcome.
    const chained = run.catch(() => undefined);
    this.locks.set(key, chained);
    try {
      return await run;
    } finally {
      // Drop the entry when we're still the tail of the chain, to bound the map.
      if (this.locks.get(key) === chained) {
        this.locks.delete(key);
      }
    }
  }

  private async findMatchingZone(report: Report): Promise<OutbreakZone | null> {
    // Look at all candidate zones for this disease in a generous bbox; haversine refines.
    const bbox = boundingBox(report.latitude, report.longitude, this.ESCALATE_RADIUS_KM);
    const candidates = await this.prisma.outbreakZone.findMany({
      where: {
        disease: report.disease ?? undefined,
        active: true,
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
      },
    });

    let best: { zone: OutbreakZone; distanceKm: number } | null = null;
    for (const zone of candidates) {
      const distanceKm = haversineKm(
        report.latitude,
        report.longitude,
        zone.latitude,
        zone.longitude,
      );
      if (distanceKm <= zone.radius / 1000 && (!best || distanceKm < best.distanceKm)) {
        best = { zone, distanceKm };
      }
    }
    return best?.zone ?? null;
  }

  private async shouldCreateZone(report: Report): Promise<boolean> {
    const lookback = new Date(Date.now() - this.LOOKBACK_HOURS * 60 * 60 * 1000);
    const bbox = boundingBox(report.latitude, report.longitude, this.CREATE_RADIUS_KM);

    const recent = await this.prisma.report.findMany({
      where: {
        disease: report.disease ?? undefined,
        processingStatus: ProcessingStatus.SUCCESS,
        createdAt: { gte: lookback },
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
      },
      select: { latitude: true, longitude: true },
    });

    const within = recent.filter(
      (r) =>
        haversineKm(report.latitude, report.longitude, r.latitude, r.longitude) <=
        this.CREATE_RADIUS_KM,
    );

    return within.length >= this.CREATE_THRESHOLD;
  }

  private async createZone(report: Report): Promise<void> {
    const lookback = new Date(Date.now() - this.LOOKBACK_HOURS * 60 * 60 * 1000);
    const bbox = boundingBox(report.latitude, report.longitude, this.CREATE_RADIUS_KM);

    // Pull contributing reports to seed accurate counts + centroid + crop list.
    const contributing = await this.prisma.report.findMany({
      where: {
        disease: report.disease ?? undefined,
        processingStatus: ProcessingStatus.SUCCESS,
        createdAt: { gte: lookback },
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
      },
    });

    const within = contributing.filter(
      (r) =>
        haversineKm(report.latitude, report.longitude, r.latitude, r.longitude) <=
        this.CREATE_RADIUS_KM,
    );

    // Centroid = mean of contributing report coordinates.
    const sum = within.reduce(
      (acc, r) => ({ lat: acc.lat + r.latitude, lng: acc.lng + r.longitude }),
      { lat: 0, lng: 0 },
    );
    const centroid = {
      lat: sum.lat / within.length,
      lng: sum.lng / within.length,
    };

    const highCount = within.filter((r) => r.severity === Severity.HIGH).length;
    const cropTypes = Array.from(new Set(within.map((r) => r.cropType)));

    const created = await this.prisma.outbreakZone.create({
      data: {
        disease: report.disease ?? '',
        latitude: centroid.lat,
        longitude: centroid.lng,
        radius: this.CREATE_RADIUS_KM * 1000,
        reportCount: within.length,
        highCount,
        severity: this.computeSeverity(within.length, highCount),
        affectedCropTypes: cropTypes,
        active: true,
        lastSeenAt: new Date(),
      },
    });

    this.logger.log(
      `Outbreak created: ${created.disease} @ (${centroid.lat.toFixed(3)}, ${centroid.lng.toFixed(3)}) — ${created.reportCount} reports, severity=${created.severity}`,
    );
    this.service.invalidate();
    this.realtime.outbreakCreated(created);
    void this.fanout.handleOutbreakCreated(created).catch((err) => {
      this.logger.warn(`Outbreak fanout failed: ${(err as Error).message}`);
    });
  }

  private async attachToZone(zone: OutbreakZone, report: Report): Promise<void> {
    const newCentroid = rollingCentroid(
      { lat: zone.latitude, lng: zone.longitude },
      zone.reportCount,
      { lat: report.latitude, lng: report.longitude },
    );

    const newReportCount = zone.reportCount + 1;
    const newHighCount = zone.highCount + (report.severity === Severity.HIGH ? 1 : 0);
    const nextSeverity = this.computeSeverity(newReportCount, newHighCount);

    // If we're transitioning to MEDIUM or HIGH and the report sits past the
    // current radius, expand to ESCALATE_RADIUS_KM.
    const distanceKm = haversineKm(
      newCentroid.lat,
      newCentroid.lng,
      report.latitude,
      report.longitude,
    );
    const radiusMeters =
      nextSeverity !== Severity.LOW && distanceKm * 1000 > zone.radius
        ? Math.max(zone.radius, this.ESCALATE_RADIUS_KM * 1000)
        : zone.radius;

    const cropTypes = zone.affectedCropTypes.includes(report.cropType)
      ? zone.affectedCropTypes
      : [...zone.affectedCropTypes, report.cropType];

    const updated = await this.prisma.outbreakZone.update({
      where: { id: zone.id },
      data: {
        latitude: newCentroid.lat,
        longitude: newCentroid.lng,
        radius: radiusMeters,
        reportCount: newReportCount,
        highCount: newHighCount,
        severity: nextSeverity,
        affectedCropTypes: cropTypes,
        lastSeenAt: new Date(),
      },
    });

    if (nextSeverity !== zone.severity) {
      this.logger.log(
        `Outbreak ${updated.id} escalated: ${zone.severity} → ${nextSeverity} (count=${newReportCount}, high=${newHighCount})`,
      );
      void this.fanout.handleOutbreakEscalated(updated, zone.severity).catch((err) => {
        this.logger.warn(`Escalation fanout failed: ${(err as Error).message}`);
      });
    }
    this.service.invalidate();
    this.realtime.outbreakUpdated(updated);
  }

  /**
   * Severity rule:
   *   HIGH if reportCount ≥ HIGH_REPORT_COUNT OR highCount ≥ HIGH_SEVERITY_COUNT
   *   MEDIUM if reportCount ≥ ESCALATE_THRESHOLD
   *   LOW otherwise
   */
  private computeSeverity(reportCount: number, highCount: number): Severity {
    if (reportCount >= this.HIGH_REPORT_COUNT || highCount >= this.HIGH_SEVERITY_COUNT) {
      return Severity.HIGH;
    }
    if (reportCount >= this.ESCALATE_THRESHOLD) return Severity.MEDIUM;
    return Severity.LOW;
  }

  /**
   * Called by the scheduler. Marks zones with no recent activity as resolved.
   */
  async deactivateStaleZones(): Promise<number> {
    const cutoff = await this.deactivationCutoff();
    const stale = await this.prisma.outbreakZone.findMany({
      where: { active: true, lastSeenAt: { lt: cutoff } },
    });
    if (stale.length === 0) return 0;

    let resolvedCount = 0;
    for (const zone of stale) {
      // Conditional update guards against a report that attached (and bumped
      // lastSeenAt) between the findMany above and this write — without the
      // guard we'd resolve a freshly-active zone and emit a false
      // outbreak.resolved. updateMany returns count=0 if the row no longer
      // matches, in which case we skip the event.
      const result = await this.prisma.outbreakZone.updateMany({
        where: { id: zone.id, active: true, lastSeenAt: { lt: cutoff } },
        data: { active: false, resolvedAt: new Date() },
      });
      if (result.count === 0) continue;
      resolvedCount += 1;

      const updated = await this.prisma.outbreakZone.findUnique({ where: { id: zone.id } });
      if (!updated) continue;
      this.realtime.outbreakResolved(updated);
      void this.fanout.handleOutbreakResolved(updated).catch((err) => {
        this.logger.warn(`Resolved fanout failed: ${(err as Error).message}`);
      });
    }
    if (resolvedCount === 0) return 0;
    this.service.invalidate();
    this.logger.log(`Deactivated ${resolvedCount} stale outbreak zone(s)`);
    return resolvedCount;
  }

  private async deactivationCutoff(): Promise<Date> {
    return new Date(
      Date.now() -
        // re-read each cron tick so a runtime env override is respected
        Number(process.env.OUTBREAK_DEACTIVATE_HOURS ?? 48) * 60 * 60 * 1000,
    );
  }
}
