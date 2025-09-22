/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly NODE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.webp' {
  const src: string
  export default src
}

declare module '*.css' {
  const content: Record<string, string>
  export default content
}
