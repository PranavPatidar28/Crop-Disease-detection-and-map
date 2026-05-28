import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';
import type { Severity } from '@/features/upload-report/types';
import { Text, View } from '@/tw';

import type { AnalysisResult } from '../types';

interface Props {
  initial: AnalysisResult;
  onSave: (patch: Partial<AnalysisResult>) => void;
}

export interface EditDetailsSheetHandle {
  present: () => void;
  dismiss: () => void;
}

const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH'];
const TONE: Record<Severity, 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

export const EditDetailsSheet = forwardRef<EditDetailsSheetHandle, Props>(
  function EditDetailsSheet({ initial, onSave }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [disease, setDisease] = useState(initial.disease ?? '');
    const [severity, setSeverity] = useState<Severity | null>(initial.severity);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={['62%']}
        backgroundStyle={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{ backgroundColor: '#e8e4dc', width: 36 }}
      >
        <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
          <Text className="text-lg font-bold text-text">Edit details</Text>
          <Input
            label="Disease"
            value={disease}
            onChangeText={setDisease}
            placeholder="e.g. Tomato leaf curl"
          />
          <View>
            <SectionLabel>Severity</SectionLabel>
            <View className="mt-2 flex-row gap-2">
              {SEVERITIES.map((s) => (
                <Chip
                  key={s}
                  label={s[0] + s.slice(1).toLowerCase()}
                  active={severity === s}
                  onPress={() => setSeverity(s)}
                  tone={TONE[s]}
                />
              ))}
            </View>
          </View>
          <Button
            label="Save changes"
            variant="gradient"
            onPress={() => {
              onSave({ disease: disease || null, severity, edited: true });
              sheetRef.current?.dismiss();
            }}
          />
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
