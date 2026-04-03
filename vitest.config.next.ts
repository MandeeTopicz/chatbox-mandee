import path from 'node:path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    env: {
      ...loadEnv(mode, process.cwd(), ''),
    },
    include: [
      'app/**/tests/**/*.test.{ts,tsx}',
      'lib/tests/**/*.test.{ts,tsx}',
      'evals/**/*.eval.ts',
    ],
    exclude: ['node_modules', 'src/**'],
    testTimeout: 30000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
}))
