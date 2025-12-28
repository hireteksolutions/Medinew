// Main configuration export
// Re-export all configuration from theme
export * from './theme';

// Default export for convenience
import { THEME_CONFIG, PROJECT_CONFIG, THEME_COLORS, TYPOGRAPHY } from './theme';
export default {
  theme: THEME_CONFIG,
  project: PROJECT_CONFIG,
  colors: THEME_COLORS,
  typography: TYPOGRAPHY,
};

