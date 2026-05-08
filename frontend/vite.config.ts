import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['three'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'd3-force',
      'three',
      'three-stdlib',
      '@react-three/fiber',
      '@react-three/drei',
    ],
    exclude: ['@react-three/postprocessing', 'postprocessing'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

