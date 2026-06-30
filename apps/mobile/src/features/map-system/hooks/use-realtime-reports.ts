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
      // The backend emits the resolved zone with `active: false`. Upsert it
      // (rather than deleting) so the map's `showResolved` filter can decide
      // whether to dim or hide it. Deleting here would yank a just-resolved
      // outbreak off the map even when the user has "Show resolved" enabled.
      if (payload?.zone) upsertOutbreak(payload.zone);
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
  }, [socket, upsertReport, upsertOutbreak]);
}
