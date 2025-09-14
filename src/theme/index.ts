import { DarkTheme as NavigationDarkTheme, Theme } from '@react-navigation/native';

export const colors = {
  background: '#0f1115',
  surface: '#161a20',
  surface2: '#1f2430',
  outline: '#2a2f3a',
  textPrimary: '#ffffff',
  textSecondary: '#b3bdcc',
  textMuted: '#8a94a7',
  primary: '#ff6b35',
  primaryMuted: '#ff7f54',
  success: '#27ae60',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#3498db',
  tabBar: '#12151a',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const navigationTheme: Theme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.outline,
    primary: colors.primary,
  },
};



