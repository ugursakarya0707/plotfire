/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIVEKIT_WS_URL: string;
  // diğer ortam değişkenleri buraya eklenebilir
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
