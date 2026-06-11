/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_URL?: string;
  readonly VITE_API_TARGET?: string;
  readonly VITE_DEMO_AUTH?: string;
  readonly VITE_USE_BACKEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
