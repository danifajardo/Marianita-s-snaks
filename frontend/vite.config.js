import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    env: {
      VITE_PIN_MARIANITA: '1234',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/main.jsx', 'src/test/**'],
      thresholds: {
        lines:      70,
        functions:  70,
        statements: 70,
        branches:   60,
      },
    },
  },
})
