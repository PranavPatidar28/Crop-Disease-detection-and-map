import { useEffect } from 'react';

import type { Report } from '@/features/upload-report/types';
import { useSocket } from '@/providers/socket-provider';

import { useLiveReportsStore } from '../store/live-reports.store';
import type { OutbreakZone } from '../types';

interface ReportCreatedPayload {
  report: Report;
}
interface OutbreakPayload {
  zone: OutbreakZone;
}

/**
 * Subscribes to the socket events that keep the live-reports store fresh.
 * Should be mounted once on the map screen.
 */
export function useRealtimeReports(): void {
  const { socket } = useSocket();
  const upsertReport = useLiveReportsStore((s) => s.upsertReport);
  const upsertOutbreak = useLiveReportsStore((s) => s.upsertOutbreak);
  const removeOutbreak = useLiveReportsStore((s) => s.removeOutbreak);

  useEffect(() => {
    if (!socket) return undefined;

    const onReportCreated = (payload: ReportCreatedPayload) => {
      if (payload?.report) upsertReport(payload.report);
    };
    const onOutbreakCreated = (payload: OutbreakPayload) => {
      if (payload?.zone) upsertOutbreak(payload.zone);
    };
    const onOutbreakUpdated = (payload: OutbreakPayload) => {
      if (payload?.zone) upsertOutbreak(payload.zone);
    };
    const onOutbreakResolved = (payload: OutbreakPayload) => {
      // For resolved outbreaks: keep the row but mark inactive so the UI can
      // animate its removal. The store handles persistence via upsert; we
      // delete from the active map.
      if (payload?.zone) removeOutbreak(payload.zone.id);
    };

    socket.on('report.created', onReportCreated);
    socket.on('outbreak.created', onOutbreakCreated);
    socket.on('outbreak.updated', onOutbreakUpdated);
    socket.on('outbreak.resolved', onOutbreakResolved);

    return () => {
      socket.off('report.created', onReportCreated);
      socket.off('outbreak.created', onOutbreakCreated);
      socket.off('outbreak.updated', onOutbreakUpdated);
      socket.off('outbreak.resolved', onOutbreakResolved);
    };
  }, [socket, upsertReport, upsertOutbreak, removeOutbreak]);
}
