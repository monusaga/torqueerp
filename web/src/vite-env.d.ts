/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Firebase Authentication (Google provider) — preferred mechanism */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Google Identity Services OAuth Web Client ID — alternative mechanism */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
