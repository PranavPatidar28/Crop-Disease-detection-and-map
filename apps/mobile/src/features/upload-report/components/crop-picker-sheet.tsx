import { BottomSheetFlatList, BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Search, X } from 'lucide-react-native';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { CROPS, type Crop } from '@/constants/crops';
import { useTheme } from '@/hooks/use-theme';
import { Text, View } from '@/tw';

interface CropPickerSheetProps {
  selectedId: string | null;
  onSelect: (crop: Crop) => void;
}

export const CropPickerSheet = forwardRef<BottomSheetModal, CropPickerSheetProps>(
  function CropPickerSheet({ selectedId, onSelect }, ref) {
    const theme = useTheme();
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return CROPS;
      return CROPS.filter(
        (c) => c.name.toLowerCase().includes(q) || c.category.includes(q),
      );
    }, [query]);

    const handleSelect = useCallback(
      (crop: Crop) => {
        onSelect(crop);
        // @ts-expect-error: ref is from forwardRef, .current is BottomSheetModal
        ref?.current?.dismiss();
      },
      [onSelect, ref],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['80%']}
        backgroundStyle={{ backgroundColor: theme.surfaceElevated }}
        handleIndicatorStyle={{ backgroundColor: theme.borderStrong }}
      >
        <View className="flex-1 px-5 pt-2">
          <View className="flex-row items-center justify-between pb-3">
            <Text className="text-xl font-bold text-text">Choose crop</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => {
                // @ts-expect-error: ref provided
                ref?.current?.dismiss();
              }}
              className="h-9 w-9 items-center justify-center rounded-full bg-surface"
            >
              <X size={18} color={theme.text} strokeWidth={2} />
            </Pressable>
          </View>

          <View className="mb-3 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3">
            <Search size={18} color={theme.textSubtle} strokeWidth={2} />
            <BottomSheetTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search crops"
              placeholderTextColor={theme.textSubtle}
              style={{ flex: 1, height: 44, color: theme.text, fontSize: 15 }}
            />
          </View>

          <BottomSheetFlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View className="h-1.5" />}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  <View
                    className={`flex-row items-center gap-3 rounded-2xl border px-3 py-3 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-bg">
                      <Text className="text-xl">{item.emoji}</Text>
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-base font-semibold text-text">{item.name}</Text>
                      <Text className="text-[11px] uppercase tracking-wider text-text-subtle">
                        {item.category}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-sm text-text-muted">No crops match &ldquo;{query}&rdquo;</Text>
              </View>
            }
          />
        </View>
      </BottomSheetModal>
    );
  },
);
