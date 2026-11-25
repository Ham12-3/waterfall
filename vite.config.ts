import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Bind IPv4 explicitly: Node resolves "localhost" to IPv6 only on this machine,
  // which some browsers fail to reach.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
