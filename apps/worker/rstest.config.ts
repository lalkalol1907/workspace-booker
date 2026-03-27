import { defineConfig } from '@rstest/core';

export default defineConfig({
  testMatch: ['src/**/*.spec.ts'],
  source: {
    decorators: {
      version: 'legacy',
    },
  },
});
