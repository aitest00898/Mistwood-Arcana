import type { Direction16 } from './types';

/**
 * Runtime sprite order follows the supplied hero sheets:
 * d00..d07 are the first source row, d08..d15 the second source row.
 * The visual ring starts camera-facing/down and advances clockwise.
 */
export const DIRECTION16_NAMES = [
  'front',
  'front-right-22',
  'front-right-45',
  'front-right-67',
  'right',
  'back-right-67',
  'back-right-45',
  'back-right-22',
  'back',
  'back-left-22',
  'back-left-45',
  'back-left-67',
  'left',
  'front-left-67',
  'front-left-45',
  'front-left-22',
] as const;

const SECTOR = (Math.PI * 2) / 16;

export const direction16FromVector = (x: number, y: number, previous: Direction16 = 0): Direction16 => {
  if (Math.hypot(x, y) < 0.05) return previous;
  // atan2(x, y) makes screen-down d00, screen-right d04, screen-up d08,
  // and screen-left d12. Rounding selects the nearest 22.5 degree slot.
  const raw = Math.round(Math.atan2(x, y) / SECTOR);
  return ((raw % 16) + 16) % 16 as Direction16;
};

export const direction16Label = (direction: Direction16): string => `d${String(direction).padStart(2, '0')} ${DIRECTION16_NAMES[direction]}`;
