import type { LucideIcon } from 'lucide-react-native';

import type { Align, TriggerVariant } from './anchor-position';

export type { Align, TriggerVariant };

export type DropdownMode = 'select' | 'menu';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  /** Secondary line under the label. */
  description?: string;
  /** Leading icon. */
  icon?: LucideIcon;
  /** Red label/icon — for destructive actions in menu mode. */
  destructive?: boolean;
  /** Greyed, non-tappable. */
  disabled?: boolean;
}

export interface DropdownSection<T = string> {
  /** Small uppercase section header. */
  label?: string;
  options: DropdownOption<T>[];
}

export type DropdownItems<T = string> =
  | DropdownOption<T>[]
  | DropdownSection<T>[];

/** Narrowing helper: did the caller pass sectioned items? */
export function isSectioned<T>(
  items: DropdownItems<T>,
): items is DropdownSection<T>[] {
  return items.length > 0 && 'options' in items[0];
}

/** Flatten items to a single option list (sections concatenated). */
export function flattenItems<T>(items: DropdownItems<T>): DropdownOption<T>[] {
  return isSectioned(items)
    ? items.flatMap((s) => s.options)
    : (items as DropdownOption<T>[]);
}
