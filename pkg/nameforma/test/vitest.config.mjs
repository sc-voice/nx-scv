import { defineConfig } from 'vitest/config';

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
            'test/**/helpers.ts',
            'test/**/*.helpers.ts',
            'test/**/*.integration.ts',
          ],
          setupFiles: ['test/vitest-setup.helpers.ts'],
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
