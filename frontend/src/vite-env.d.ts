/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the API when it is not served from the same origin as the site (e.g. https://api.example.com). */
  readonly VITE_API_URL?: string;
  /** Origin used when building QR / share links (defaults to the current site origin). */
  readonly VITE_PUBLIC_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
