import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // reachable from other devices on the tailnet during development
  server: { host: true, allowedHosts: ['arch', '.ts.net'] },
})
