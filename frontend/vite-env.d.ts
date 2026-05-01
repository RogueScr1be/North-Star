/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LAYOUT_ENGINE_ENABLED?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_PULSAR_NODES_ENABLED?: string;
  readonly VITE_CSS3D_PANELS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
