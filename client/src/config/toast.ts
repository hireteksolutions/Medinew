/**
 * Toast notification configuration
 * Configures react-hot-toast to show notifications at top-center
 */
export const TOAST_CONFIG = {
  position: 'top-center' as const,
  duration: 4000,
  style: {
    borderRadius: '8px',
    background: '#fff',
    color: '#363636',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  success: {
    duration: 3000,
    iconTheme: {
      primary: '#10b981',
      secondary: '#fff',
    },
  },
  error: {
    duration: 5000,
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  },
};

