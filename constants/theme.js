/**
 * AgriTask Design System
 * Premium dark theme with green accent
 */

export const Colors = {
  // Core backgrounds
  background: '#0f172a',
  surface: '#1e293b',
  surfaceElevated: '#263348',
  card: '#1e293b',
  cardBorder: '#334155',

  // Brand
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primaryLight: '#4ade80',
  primaryMuted: 'rgba(34, 197, 94, 0.15)',

  // Secondary
  secondary: '#334155',
  secondaryLight: '#475569',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#0f172a',

  // Status colors
  success: '#22c55e',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  error: '#ef4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3b82f6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',

  // Task status
  statusPending: '#f59e0b',
  statusPendingBg: 'rgba(245, 158, 11, 0.15)',
  statusActive: '#3b82f6',
  statusActiveBg: 'rgba(59, 130, 246, 0.15)',
  statusCompleted: '#22c55e',
  statusCompletedBg: 'rgba(34, 197, 94, 0.15)',
  statusCancelled: '#ef4444',
  statusCancelledBg: 'rgba(239, 68, 68, 0.15)',

  // UI
  border: '#334155',
  divider: '#1e293b',
  overlay: 'rgba(0, 0, 0, 0.6)',
  inputBg: '#1e293b',
  inputBorder: '#334155',
  inputFocusBorder: '#22c55e',

  // Tab bar
  tabActive: '#22c55e',
  tabInactive: '#64748b',
  tabBar: '#0f172a',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,

  // Font weights
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  green: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};
