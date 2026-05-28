import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CROPS, type Crop } from '@/constants/crops';
import { QueueStatusCard } from '@/features/offline-sync/components/queue-status-card';
import {
  CropPickerRow,
  CropPickerSheet,
  ImagePickerCard,
  LocationCard,
  MapPickerSheet,
  NotesInput,
  PendingUploadsSection,
  UploadProgress,
} from '@/features/upload-report/components';
import { GradientSubmitButton } from '@/features/upload-report/components/upload-progress';
import {
  useCreateReport,
  useCurrentLocation,
  useImagePicker,
} from '@/features/upload-report/hooks';
import { useOfflineQueueStore } from '@/features/upload-report/store/offline-queue.store';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

export default function UploadScreen() {
  const picker = useImagePicker();
  const locationCtl = useCurrentLocation(true);
  const retryAll = useOfflineQueueStore((s) => s.retryAll);

  const [cropId, setCropId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ image?: string; crop?: string; location?: string }>({});

  const create = useCreateReport();

  const cropSheetRef = useRef<BottomSheetModal>(null);
  const mapSheetRef = useRef<BottomSheetModal>(null);

  const selectedCrop: Crop | undefined = cropId ? CROPS.find((c) => c.id === cropId) : undefined;

  const handleSubmit = async () => {
    const next: typeof errors = {};
    if (!picker.picked) next.image = 'Add a crop photo';
    if (!cropId) next.crop = 'Choose a crop';
    if (!locationCtl.location) next.location = 'Set the location';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (!picker.picked || !selectedCrop || !locationCtl.location) return;

    await create.submit({
      picked: picker.picked,
      cropTypeId: selectedCrop.id,
      cropTypeName: selectedCrop.name,
      notes: notes.trim() || undefined,
      location: locationCtl.location,
    });
  };

  const submitDisabled =
    create.state === 'compressing' ||
    create.state === 'uploading' ||
    create.state === 'processing';

  return (
    <View className="flex-1 bg-bg">
      <LinearGradient
        colors={[palette.brand[700], palette.brand[900], '#0b1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0, opacity: 0.5 }}
      />

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160, gap: 16 }}
          >
            <Animated.View entering={FadeInDown.duration(400)} className="gap-1 pb-2 pt-2">
              <Text className="text-3xl font-bold text-white">Diagnose a crop</Text>
              <Text className="text-sm text-white/70">
                Snap a photo and we&apos;ll match it against known disease patterns.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(400)}>
              <ImagePickerCard
                picked={picker.picked}
                onPickCamera={() => {
                  void picker.pickFromCamera();
                  setErrors((e) => ({ ...e, image: undefined }));
                }}
                onPickGallery={() => {
                  void picker.pickFromGallery();
                  setErrors((e) => ({ ...e, image: undefined }));
                }}
                onClear={() => picker.reset()}
              />
              {errors.image ? (
                <Text className="mt-1.5 ml-1 text-xs text-danger">{errors.image}</Text>
              ) : null}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(400)}>
              <CropPickerRow
                cropId={cropId}
                onPress={() => cropSheetRef.current?.present()}
                error={errors.crop}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <LocationCard
                location={locationCtl.location}
                status={locationCtl.status}
                errorMessage={errors.location ?? locationCtl.errorMessage}
                onRefresh={() => {
                  void locationCtl.refresh();
                  setErrors((e) => ({ ...e, location: undefined }));
                }}
                onAdjust={() => mapSheetRef.current?.present()}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(260).duration(400)}>
              <NotesInput value={notes} onChangeText={setNotes} />
            </Animated.View>

            {create.state !== 'idle' && create.state !== 'success' ? (
              <Animated.View entering={FadeInDown.duration(300)}>
                <UploadProgress
                  state={create.state}
                  progress={create.progress}
                  errorMessage={create.error}
                />
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(320).duration(400)}>
              <GradientSubmitButton
                label="Submit report"
                onPress={handleSubmit}
                loading={submitDisabled}
                disabled={submitDisabled}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(380).duration(400)}>
              <QueueStatusCard onRetryAll={() => void retryAll()} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(420).duration(400)}>
              <PendingUploadsSection />
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CropPickerSheet
        ref={cropSheetRef}
        selectedId={cropId}
        onSelect={(c) => {
          setCropId(c.id);
          setErrors((e) => ({ ...e, crop: undefined }));
        }}
      />

      <MapPickerSheet
        ref={mapSheetRef}
        initialLocation={locationCtl.location}
        onConfirm={(lat, lng) => locationCtl.setManual(lat, lng)}
      />
    </View>
  );
}
