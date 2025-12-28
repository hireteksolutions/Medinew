import React, { createContext, useContext, useState, ReactNode } from 'react';
import Loader from '../components/common/Loader';

interface LoaderContextType {
  showLoader: (text?: string) => void;
  hideLoader: () => void;
  isLoading: boolean;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const LoaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | undefined>(undefined);

  const showLoader = (text?: string) => {
    setLoadingText(text);
    setLoading(true);
  };

  const hideLoader = () => {
    setLoading(false);
    setLoadingText(undefined);
  };

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, isLoading: loading }}>
      {children}
      {loading && <Loader fullScreen text={loadingText} />}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};

