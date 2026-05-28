import { Platform, ViewStyle } from 'react-native';

type Shadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const make = (
  shadowColor: string,
  shadowOpacity: number,
  shadowRadius: number,
  offsetY: number,
  elevation: number,
): Shadow => ({
  shadowColor,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity,
  shadowRadius,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  none: make('transparent', 0, 0, 0, 0),
  sm: make('#0b1220', 0.06, 6, 2, 1),
  md: make('#0b1220', 0.1, 12, 4, 4),
  lg: make('#0b1220', 0.14, 20, 8, 8),
  xl: make('#0b1220', 0.2, 28, 12, 16),
} as const;

export type ShadowToken = keyof typeof shadows;
