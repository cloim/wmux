import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5270,
    strictPort: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
