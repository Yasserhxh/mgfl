/**
 * Design tokens — single source of truth for colors, spacing and typography.
 * Values mirror the web back-office tokens (CLAUDE.md §9).
 * Never hardcode hex values in components: import from here.
 */

import type { PreDeclarationStatus } from '../types';

export const colors = {
  primary: '#1A7F37',
  primaryHover: '#116329',
  accent: '#94C245',

  success: '#00BC7D',
  danger: '#E7000B',
  warning: '#B69E05',
  info: '#1183D4',

  bg: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E4E4E7',
  text: '#111113',
  muted: '#71717A',

  /* Modal backdrop (text color at 50% alpha). */
  overlay: '#11111380',

  /* Soft tints for pills / banners (mirroring the web `soft` variants). */
  successSoft: '#E3F8F0',
  dangerSoft: '#FCE6E7',
  warningSoft: '#FBF5DA',
  infoSoft: '#E3F1FB',
  accentSoft: '#E6F4EA',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
} as const;

/** Status pill palette: En attente = amber, Pesé = blue, Clôturé = green. */
export const statusStyle: Record<PreDeclarationStatus, { bg: string; fg: string }> = {
  'En attente': { bg: colors.warningSoft, fg: colors.warning },
  'Pesé': { bg: colors.infoSoft, fg: colors.info },
  'Clôturé': { bg: colors.successSoft, fg: colors.success },
};

/** Shared card shadow (kept subtle for a clean back-office look). */
export const cardShadow = {
  shadowColor: colors.text,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
} as const;
