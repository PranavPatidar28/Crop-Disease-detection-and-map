import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, type ReactNode } from 'react';

import { useTheme } from '@/hooks/use-theme';

export interface BottomSheetWrapperProps
  extends Omit<BottomSheetModalProps, 'children' | 'snapPoints' | 'ref'> {
  children: ReactNode;
  /** Snap points (percent strings or numbers). Defaults to ['50%', '90%']. */
  snapPoints?: (string | number)[];
}

export const BottomSheetWrapper = forwardRef<BottomSheetModal, BottomSheetWrapperProps>(
  function BottomSheetWrapper(
    { children, snapPoints, backgroundStyle, handleIndicatorStyle, ...rest },
    ref,
  ) {
    const theme = useTheme();
    const points = useMemo(() => snapPoints ?? ['50%', '90%'], [snapPoints]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={points}
        backdropComponent={renderBackdrop}
        backgroundStyle={[{ backgroundColor: theme.surfaceElevated }, backgroundStyle]}
        handleIndicatorStyle={[{ backgroundColor: theme.borderStrong }, handleIndicatorStyle]}
        {...rest}
      >
        {children}
      </BottomSheetModal>
    );
  },
);
