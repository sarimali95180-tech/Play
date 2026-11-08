import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 = reachable from phone/tablet on the same Wi‑Fi
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
