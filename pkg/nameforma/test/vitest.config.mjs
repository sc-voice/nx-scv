import { defineConfig } from '@sc-voice/vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.ts'],
    exclude: ['test/vitest.config.mjs', 'test/**/*helpers*'],
    setupFiles: [],
  },
});
