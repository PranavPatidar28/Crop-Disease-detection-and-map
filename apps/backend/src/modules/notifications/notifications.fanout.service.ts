import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, type OutbreakZone, type Report, Severity } from '@prisma/client';

import { boundingBox, haversineKm } from '@/common/utils/geo.utils';
import type { Env } from '@/config/env.schema';
import { PrismaService } from '@/modules/prisma/prisma.service';

import { NotificationsService } from './notifications.service';
import {
  highSeverityReportTemplate,
  outbreakCreatedTemplate,
  outbreakEscalatedTemplate,
  outbreakResolvedTemplate,
} from './templates';

/**
 * Decides who gets which notification, applying:
 *   - geographic match (user's active plots intersect the trigger area)
 *   - per-user notification preferences
 *   - dedup window (don't spam the same user about the same outbreak)
 *
 * Called by OutbreakProcessor + ReportsProcessor.
 */
@Injectable()
export class NotificationsFanoutService {
  private readonly logger = new Logger(NotificationsFanoutService.name);
  private readonly bufferKm: number;
  private readonly dedupHours: number;
  private readonly reportTriggerRadiusKm: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    config: ConfigService<Env, true>,
  ) {
    this.bufferKm = config.get('NOTIFICATION_NEARBY_BUFFER_KM', { infer: true });
    this.dedupHours = config.get('NOTIFICATION_DEDUP_WINDOW_HOURS', { infer: true });
    this.reportTriggerRadiusKm = config.get('NOTIFICATION_REPORT_TRIGGER_RADIUS_KM', {
      infer: true,
    });
  }

  /** Fired by OutbreakProcessor when a new zone is created. */
  async handleOutbreakCreated(zone: OutbreakZone): Promise<void> {
    const radiusKm = zone.radius / 1000 + this.bufferKm;
    const userIds = await this.findUsersWithPlotsNear(
      zone.latitude,
      zone.longitude,
      radiusKm,
      'outbreakAlerts',
    );

    const filtered = await this.dedupForOutbreak(userIds, zone.id);
    if (filtered.length === 0) return;

    await this.notifications.createForUsers(filtered, outbreakCreatedTemplate(zone));
  }

  /** Fired by OutbreakProcessor when severity escalates. Notify only previously-notified users. */
  async handleOutbreakEscalated(zone: OutbreakZone, prevSeverity: Severity): Promise<void> {
    const userIds = await this.findUsersPreviouslyNotifiedAbout(zone.id);
    if (userIds.length === 0) return;

    const filtered = await this.filterByPreference(userIds, 'severityEscalations');
    if (filtered.length === 0) return;

    await this.notifications.createForUsers(
      filtered,
      outbreakEscalatedTemplate(zone, prevSeverity),
    );
  }

  /** Fired by OutbreakScheduler.deactivateStaleZones. */
  async handleOutbreakResolved(zone: OutbreakZone): Promise<void> {
    const userIds = await this.findUsersPreviouslyNotifiedAbout(zone.id);
    if (userIds.length === 0) return;

    const filtered = await this.filterByPreference(userIds, 'resolvedAlerts');
    if (filtered.length === 0) return;

    await this.notifications.createForUsers(filtered, outbreakResolvedTemplate(zone));
  }

  /**
   * Fired by ReportsProcessor when a HIGH-severity report is created.
   * Recipients: users with active plots within `NOTIFICATION_REPORT_TRIGGER_RADIUS_KM`.
   * Excludes the reporter themselves.
   */
  async handleHighSeverityReport(report: Report): Promise<void> {
    if (report.severity !== Severity.HIGH || !report.disease) return;

    const userIds = await this.findUsersWithPlotsNear(
      report.latitude,
      report.longitude,
      this.reportTriggerRadiusKm,
      'reportAlerts',
    );

    // Don't notify the user who submitted the report
    const filtered = userIds.filter((uid) => uid !== report.userId);
    if (filtered.length === 0) return;

    await this.notifications.createForUsers(filtered, highSeverityReportTemplate(report));
  }

  /**
   * Returns userIds whose active plots are within `radiusKm` of the given point
   * AND whose preferences enable the given category.
   * Default (no preferences row) = enabled.
   */
  private async findUsersWithPlotsNear(
    lat: number,
    lng: number,
    radiusKm: number,
    prefKey: 'outbreakAlerts' | 'reportAlerts' | 'severityEscalations' | 'resolvedAlerts',
  ): Promise<string[]> {
    const bbox = boundingBox(lat, lng, radiusKm);

    const plots = await this.prisma.plot.findMany({
      where: {
        active: true,
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
      },
      select: { userId: true, latitude: true, longitude: true },
    });

    const within = plots.filter((p) => haversineKm(lat, lng, p.latitude, p.longitude) <= radiusKm);

    const userIds = Array.from(new Set(within.map((p) => p.userId)));
    if (userIds.length === 0) return [];

    return this.filterByPreference(userIds, prefKey);
  }

  private async findUsersPreviouslyNotifiedAbout(outbreakId: string): Promise<string[]> {
    const previous = await this.prisma.notification.findMany({
      where: {
        type: NotificationType.OUTBREAK,
        data: { path: ['outbreakId'], equals: outbreakId },
      },
      select: { userId: true },
    });
    return Array.from(new Set(previous.map((p) => p.userId)));
  }

  private async dedupForOutbreak(userIds: string[], outbreakId: string): Promise<string[]> {
    if (userIds.length === 0) return [];

    const cutoff = new Date(Date.now() - this.dedupHours * 60 * 60 * 1000);
    const recent = await this.prisma.notification.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: cutoff },
        data: { path: ['outbreakId'], equals: outbreakId },
      },
      select: { userId: true },
    });

    const seen = new Set(recent.map((r) => r.userId));
    return userIds.filter((uid) => !seen.has(uid));
  }

  private async filterByPreference(
    userIds: string[],
    prefKey: 'outbreakAlerts' | 'reportAlerts' | 'severityEscalations' | 'resolvedAlerts',
  ): Promise<string[]> {
    if (userIds.length === 0) return [];
    const prefs = await this.prisma.notificationPreferences.findMany({
      where: { userId: { in: userIds } },
    });
    const disabled = new Set(prefs.filter((p) => p[prefKey] === false).map((p) => p.userId));
    return userIds.filter((uid) => !disabled.has(uid));
  }
}
