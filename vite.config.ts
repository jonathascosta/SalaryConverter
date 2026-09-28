/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        privacy: 'privacy-policy.html',
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
