import { useLoader } from '../context/LoaderContext';
import { useCallback } from 'react';

/**
 * Hook to wrap async operations with automatic loader
 */
export const useAsyncOperation = () => {
  const { showLoader, hideLoader } = useLoader();

  const execute = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      loadingText?: string
    ): Promise<T> => {
      try {
        showLoader(loadingText);
        const result = await operation();
        return result;
      } finally {
        hideLoader();
      }
    },
    [showLoader, hideLoader]
  );

  return { execute };
};

