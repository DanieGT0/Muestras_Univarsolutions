declare module 'vite' {
  export function defineConfig(config: any): any;
  export * from 'vite/dist/node';
}

declare module '@vitejs/plugin-react' {
  function react(options?: any): any;
  export default react;
}