import { router } from 'expo-router';
import { useEffect } from 'react';

import {
  AnalyzingScreen,
  ResultScreen,
  RetakeScreen,
  SubmittedScreen,
} from '@/features/report-flow';
import { CaptureScreen } from '@/features/report-flow/screens/capture-lazy';
import { useReportFlow } from '@/features/report-flow/use-report-flow';
import { useCurrentLocation } from '@/features/upload-report/hooks';
import { View } from '@/tw';

/**
 * Full-screen report flow (root stack, outside the tab navigator). Drives:
 * Capture → Analyzing → (Retake | Result) → Submitted.
 *
 * Online: upload → HF via /diseases/analyze → review → confirm.
 * Offline / HF fails: on-device diagnosis → review → confirm → queued; the
 * backend upgrades the diagnosis to HF on sync.
 */
export default function ReportScreen() {
  const flow = useReportFlow();

  const locationCtl = useCurrentLocation(true);
  useEffect(() => {
    if (locationCtl.location) {
      flow.setLocation({
        latitude: locationCtl.location.latitude,
        longitude: locationCtl.location.longitude,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs on a new GPS fix
  }, [locationCtl.location]);

  const submitting = flow.create.state === 'uploading' || flow.create.state === 'processing';

  let body: React.ReactNode = null;
  switch (flow.state.step) {
    case 'capture':
      body = <CaptureScreen onCaptured={flow.setImage} onCancel={flow.reset} />;
      break;
    case 'analyzing':
      body = flow.state.image ? <AnalyzingScreen image={flow.state.image} /> : <View className="flex-1 bg-bg" />;
      break;
    case 'retake':
      body =
        flow.state.image && flow.state.retakeGuidance ? (
          <RetakeScreen
            image={flow.state.image}
            guidance={flow.state.retakeGuidance}
            onRetake={flow.retake}
          />
        ) : (
          <View className="flex-1 bg-bg" />
        );
      break;
    case 'result':
      body =
        flow.state.image && flow.state.result ? (
          <ResultScreen
            image={flow.state.image}
            result={flow.state.result}
            cropType={flow.state.cropType}
            notes={flow.state.notes}
            submitting={submitting}
            onChangeCrop={flow.setCrop}
            onChangeNotes={flow.setNotes}
            onConfirm={() => void flow.submit()}
          />
        ) : (
          <View className="flex-1 bg-bg" />
        );
      break;
    case 'submitted':
      body = flow.state.result ? (
        <SubmittedScreen
          result={flow.state.result}
          cropType={flow.state.cropType}
          reportId={flow.state.submittedReportId}
          onAnother={() => {
            flow.reset();
            router.replace('/report');
          }}
        />
      ) : (
        <View className="flex-1 bg-bg" />
      );
      break;
  }

  return <>{body}</>;
}
