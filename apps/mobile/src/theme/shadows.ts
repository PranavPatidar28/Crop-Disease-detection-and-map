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

/**
 * Soft, single-source shadow scale for the Soft Sage theme.
 * `cta` and `ctaSoft` use the brand-teal color so primary buttons feel "lifted".
 */
export const shadows = {
  none: make('transparent', 0, 0, 0, 0),
  card: make('#0f172a', 0.03, 2, 1, 1),
  cardHover: make('#0f172a', 0.06, 24, 8, 4),
  sheet: make('#0f172a', 0.08, 24, -8, 8),
  cta: make('#0d9488', 0.32, 14, 6, 6),
  ctaSoft: make('#0d9488', 0.18, 10, 4, 4),
  cardWarm: make('#282e26', 0.12, 18, 6, 5),
  hero: make('#0f3d2e', 0.34, 20, 8, 8),
  capsule: make('#282e26', 0.14, 16, 4, 6),
} as const;

export type ShadowToken = keyof typeof shadows;
