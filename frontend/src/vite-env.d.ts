/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly NODE_ENV: string
  readonly PROD: boolean
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

declare module 'vite' {
  const vite: any
  export default vite
  export const defineConfig: any
}

declare module '@vitejs/plugin-react' {
  const react: any
  export default react
}
