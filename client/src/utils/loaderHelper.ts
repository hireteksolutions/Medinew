/**
 * Helper utility to wrap API calls with automatic loader
 * Usage: await withLoader(() => apiCall(), 'Loading...');
 */
export const withLoader = async <T,>(
  operation: () => Promise<T>,
  showLoader: (text?: string) => void,
  hideLoader: () => void,
  loadingText?: string
): Promise<T> => {
  try {
    showLoader(loadingText);
    return await operation();
  } finally {
    hideLoader();
  }
};

