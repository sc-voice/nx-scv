import { defineConfig } from '@sc-voice/vitest/config';

export default defineConfig({
  test: {
    globals: true,
    hideSkippedTests: true,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/**/*.ts'],
          exclude: [
            'test/vitest.config.mjs',
            'test/**/*helpers*',
            'test/**/*.integration.ts',
          ],
          setupFiles: [],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/**/*.integration.ts'],
          exclude: ['**/node_modules/**', '**/.git/**'],
          testTimeout: 60000,
        },
      },
    ],
  },
});
