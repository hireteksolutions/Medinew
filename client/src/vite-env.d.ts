/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // Add other environment variables here as needed
}

// Extend the global ImportMeta interface
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

