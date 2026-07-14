/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * vitest.config.js
 *
 * Configuración de Vitest para el frontend React.
 *
 * Para instalar las dependencias necesarias:
 *   npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
 *
 * Scripts en package.json (agregar manualmente):
 *   "test":         "vitest run"
 *   "test:watch":   "vitest"
 *   "test:ui":      "vitest --ui"
 *   "test:coverage":"vitest run --coverage"
 */
export default defineConfig({
  plugins: [react()],

  test: {
    // Entorno de simulación de browser (jsdom para React)
    environment: 'jsdom',

    // Importar los matchers de jest-dom automáticamente en cada test
    setupFiles: ['./src/tests/setup.js'],

    // Incluir tests en src/tests/ y archivos *.test.{js,jsx,ts,tsx}
    include: [
      'src/tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],

    // Excluir node_modules y build
    exclude: ['node_modules', 'build', 'dist'],

    // Variables globales de Jest (describe, it, expect, etc.) sin necesidad de import
    globals: true,

    // Reportes: verbose en consola + generación de coverage
    reporters: ['verbose'],

    // Coverage con istanbul
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      // Carpetas a incluir en el reporte de cobertura
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/tests/**',
        'src/main.jsx',
        'src/main.tsx',
        '**/*.d.ts',
        '**/index.{js,ts}',
      ],
      // Umbrales mínimos de cobertura (activar cuando la suite esté madura)
      // thresholds: {
      //   lines: 70,
      //   branches: 60,
      //   functions: 70,
      //   statements: 70,
      // },
    },

    // Alias de resolución de módulos (igual que en vite.config.js)
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
