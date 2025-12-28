# Theme Configuration

This directory contains all configurable theme values for the application.

## Project Configuration

To change the project name, email, or other project-specific information, edit `theme.ts`:

```typescript
export const PROJECT_CONFIG = {
  name: 'MediNew',           // Change this to your project name
  shortName: 'MN',           // Short abbreviation for logos/icons
  description: 'Modern Healthcare Management System',
  email: 'info@medinew.com', // Contact email
  website: 'https://medinew.com',
} as const;
```

## Theme Colors

All theme colors are defined in `THEME_COLORS`. To change the primary color, edit:

```typescript
primary: {
  500: '#0066CC', // Change this to your primary color
  // ... other shades
}
```

### Available Color Types:
- `primary` - Main brand color
- `secondary` - Secondary accent color
- `success` - Success/positive actions
- `danger` - Error/destructive actions
- `warning` - Warning/caution states
- `info` - Informational messages
- `gray` - Neutral grays

## Typography

Font families, sizes, weights, and spacing are configured in `TYPOGRAPHY`:

```typescript
export const TYPOGRAPHY = {
  fontFamily: {
    sans: ['...'], // Change font stack
  },
  fontSize: {
    base: ['1rem', { lineHeight: '1.5rem' }], // Base font size
    // ... other sizes
  },
  // ... other typography settings
}
```

## Usage in Components

### Import Project Config:
```typescript
import { PROJECT_CONFIG } from '../config';

// Use in JSX
<span>{PROJECT_CONFIG.name}</span>
```

### Import Theme Colors:
```typescript
import { THEME_COLORS } from '../config';

// Access color values
const primaryColor = THEME_COLORS.primary[500];
```

### Import Typography:
```typescript
import { TYPOGRAPHY } from '../config';

// Access typography settings
const baseFontSize = TYPOGRAPHY.fontSize.base[0];
```

## Tailwind CSS Integration

The theme colors are also configured in `tailwind.config.js`. When you change colors in `theme.ts`, you should also update the corresponding values in the Tailwind config to ensure consistency.

## Note

After making changes to the theme configuration:
1. Update `tailwind.config.js` if you changed colors
2. Restart your development server
3. Clear browser cache if needed

