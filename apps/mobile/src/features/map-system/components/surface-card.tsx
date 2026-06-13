import { type ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { lightColors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { shadows, type ShadowToken } from '@/theme/shadows';

interface SurfaceCardProps extends ViewProps {
  children: ReactNode;
  /** Corner radius. Defaults to the `2xl` token (20). */
  radius?: number;
  /** Inner padding applied to the card. */
  padding?: number;
  /** Shadow token from the theme. Defaults to `capsule`. */
  shadow?: ShadowToken;
  /** Show the hairline border. Defaults to true. */
  bordered?: boolean;
  style?: ViewStyle;
}

/**
 * Opaque white floating surface for map overlays (search bar, control capsule).
 *
 * Unlike the previous `GlassView` approach, this never sets `overflow:'hidden'`,
 * so the drop shadow / Android elevation renders cleanly instead of being
 * clipped by the rounded corners. Solid fill also renders identically across
 * iOS and Android (glass blur barely shows on Android).
 */
export function SurfaceCard({
  children,
  radius = radii['2xl'],
  padding,
  shadow = 'capsule',
  bordered = true,
  style,
  ...rest
}: SurfaceCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: lightColors.surface,
          borderRadius: radius,
          padding,
          borderWidth: bordered ? 1 : 0,
          borderColor: lightColors.border,
        },
        shadows[shadow],
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
