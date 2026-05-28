import { type NotificationType, type OutbreakZone, type Report, Severity } from '@prisma/client';

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  body: string;
  severity: Severity | null;
  data: Record<string, unknown>;
}

export function outbreakCreatedTemplate(zone: OutbreakZone): NotificationTemplate {
  const severity = zone.severity;
  const titlePrefix =
    severity === Severity.HIGH ? '⚠️ Severe outbreak nearby' : 'Disease outbreak nearby';
  return {
    type: 'OUTBREAK',
    title: titlePrefix,
    body: `${zone.disease} detected in your area · ${zone.reportCount} reports.`,
    severity,
    data: { outbreakId: zone.id, kind: 'outbreak.created' },
  };
}

export function outbreakEscalatedTemplate(
  zone: OutbreakZone,
  prevSeverity: Severity,
): NotificationTemplate {
  return {
    type: 'WARNING',
    title: 'Outbreak escalated',
    body: `${zone.disease} outbreak escalated from ${prevSeverity.toLowerCase()} to ${zone.severity.toLowerCase()} severity.`,
    severity: zone.severity,
    data: {
      outbreakId: zone.id,
      kind: 'outbreak.escalated',
      previousSeverity: prevSeverity,
    },
  };
}

export function outbreakResolvedTemplate(zone: OutbreakZone): NotificationTemplate {
  return {
    type: 'OUTBREAK',
    title: 'Outbreak resolved',
    body: `${zone.disease} outbreak in your area has been marked resolved.`,
    severity: Severity.LOW,
    data: { outbreakId: zone.id, kind: 'outbreak.resolved' },
  };
}

export function highSeverityReportTemplate(report: Report): NotificationTemplate {
  return {
    type: 'REPORT',
    title: 'High-severity report nearby',
    body: `A ${report.cropType} ${report.disease ?? 'disease'} report was filed near your plot.`,
    severity: report.severity,
    data: { reportId: report.id, kind: 'report.high-severity' },
  };
}
