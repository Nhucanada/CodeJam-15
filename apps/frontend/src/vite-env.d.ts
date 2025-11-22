/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARTHUR_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

